// stores/useTreeStore.ts
import { create } from 'zustand';
import {
  getOrCreatePrimaryTree,
  listTrees,
  createTree,
  renameTree as renameTreeApi,
  deleteTree as deleteTreeApi,
  type TreeRow,
} from '@/lib/api/trees';
import {
  listPeople,
  createPerson,
  updatePerson,
  deletePerson,
} from '@/lib/api/people';
import {
  listRelationships,
  createRelationship,
  updateRelationship,
  deleteRelationship,
} from '@/lib/api/relationships';
import {
  getProfile,
  updateProfile as updateProfileApi,
  type Profile,
  type UpdateProfileInput,
} from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase/client';
import type { Person, Relationship } from '@/types/database';
import type { PersonFormData } from '@/components/forms/PersonForm';
import useUIStore from './useUIStore';

// ─── Free tier limits ───
export const FREE_TREE_LIMIT = 2;

// ─── Cross-tree search ───
export type SearchIndexEntry = {
  id: string;
  name: string;
  location?: string | null;
  treeId: string;
  treeName: string;
};

type TreeState = {
  tree: TreeRow | null;
  allTrees: TreeRow[];
  people: Person[];
  relationships: Relationship[];
  profile: Profile | null;
  loadingData: boolean;
  error: string | null;
  searchIndex: SearchIndexEntry[];
};

type TreeActions = {
  // Data loading
  loadTreeData: (userId: string) => Promise<void>;
  refreshData: () => Promise<void>;

  // Profile
  completeProfile: (data: {
    full_name: string;
    photo_url: string | null;
    motivation: string | null;
    family_origin: string | null;
  }) => Promise<void>;
  skipProfile: () => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;

  // Canvas operations
  clearCanvas: () => Promise<void>;

  // Capacity check
  isAtCapacity: () => boolean;
  checkCapacityAndBlock: () => boolean;

  // Multi-tree operations
  switchTree: (treeId: string) => Promise<void>;
  createNewTree: (name: string) => Promise<void>;
  renameCurrentTree: (newName: string) => Promise<void>;
  deleteCurrentTree: () => Promise<void>;

  // CRUD - People
  addPerson: (formData: PersonFormData) => Promise<void>;
  addPartner: (formData: PersonFormData) => Promise<void>;
  addChild: (formData: PersonFormData, otherParentId: string | null) => Promise<void>;
  addSibling: (formData: PersonFormData) => Promise<void>;
  addParent: (formData: PersonFormData) => Promise<void>;
  linkParent: (existingPersonId: string) => Promise<void>;
  editPerson: (formData: PersonFormData) => Promise<void>;
  removePerson: () => Promise<void>;

  // Relationships
  updatePartnerStatus: (relationshipId: string, newStatus: string) => Promise<void>;
  changeParent: (newParentId: string | null) => Promise<void>;

  // Helpers
  hasCurrentPartner: (personId: string) => boolean;
  getAllCollapsePairKeys: () => Set<string>;
  rebuildSearchIndex: () => Promise<void>;
};

// ─── Helper: get selected person from UI store + tree data ───
function getSelectedPerson(people: Person[]): Person | null {
  const { selectedPersonId } = useUIStore.getState();
  if (!selectedPersonId) return null;
  return people.find((p) => p.id === selectedPersonId) ?? null;
}

/**
 * Compute which people would become disconnected ("floating") if personId is deleted.
 * Uses connected-component analysis: BFS from the deleted person's parents to find
 * the main tree, then anything in the original component but NOT in the main tree floats.
 */
function getFloatingPeople(
  personId: string,
  people: Person[],
  relationships: Relationship[]
): Person[] {
  const allIds = new Set(people.map((p) => p.id));

  // Build original adjacency graph (before deletion)
  const origAdj = new Map<string, Set<string>>();
  for (const id of allIds) origAdj.set(id, new Set());
  for (const r of relationships) {
    if (allIds.has(r.person_a_id) && allIds.has(r.person_b_id)) {
      origAdj.get(r.person_a_id)!.add(r.person_b_id);
      origAdj.get(r.person_b_id)!.add(r.person_a_id);
    }
  }

  // Find the connected component containing personId in the original graph
  // (so we don't accidentally cascade-delete unrelated people on the same canvas)
  const originalComponent = new Set<string>();
  const q1: string[] = [personId];
  originalComponent.add(personId);
  while (q1.length > 0) {
    const current = q1.shift()!;
    for (const neighbor of origAdj.get(current) || []) {
      if (!originalComponent.has(neighbor)) {
        originalComponent.add(neighbor);
        q1.push(neighbor);
      }
    }
  }

  // Simulate deletion: remove personId from component
  const remaining = new Set(originalComponent);
  remaining.delete(personId);
  if (remaining.size === 0) return [];

  // Build post-deletion adjacency within this component
  const postAdj = new Map<string, Set<string>>();
  for (const id of remaining) postAdj.set(id, new Set());
  for (const r of relationships) {
    if (
      r.person_a_id !== personId &&
      r.person_b_id !== personId &&
      remaining.has(r.person_a_id) &&
      remaining.has(r.person_b_id)
    ) {
      postAdj.get(r.person_a_id)!.add(r.person_b_id);
      postAdj.get(r.person_b_id)!.add(r.person_a_id);
    }
  }

  // Find the deleted person's parents — they anchor the "main" tree
  const parentIds = relationships
    .filter(
      (r) => r.relationship_type === 'parent_child' && r.person_b_id === personId
    )
    .map((r) => r.person_a_id)
    .filter((id) => remaining.has(id));

  // If person has no parents (is a tree root), no cascade —
  // children keep their other parent, or become standalone roots
  if (parentIds.length === 0) return [];

  // BFS from parents to find the main tree component
  const mainTree = new Set<string>();
  const q2: string[] = [...parentIds];
  for (const pid of q2) mainTree.add(pid);

  while (q2.length > 0) {
    const current = q2.shift()!;
    for (const neighbor of postAdj.get(current) || []) {
      if (!mainTree.has(neighbor)) {
        mainTree.add(neighbor);
        q2.push(neighbor);
      }
    }
  }

  // Floating = in original component, survived deletion, but not reachable from parents
  const floatingIds = [...remaining].filter((id) => !mainTree.has(id));
  return people.filter((p) => floatingIds.includes(p.id));
}

const useTreeStore = create<TreeState & TreeActions>((set, get) => ({
  // ─── Initial state ───
  tree: null,
  allTrees: [],
  people: [],
  relationships: [],
  profile: null,
  loadingData: true,
  error: null,
  searchIndex: [],

  // ─── Data loading ───
  loadTreeData: async (userId) => {
    set({ loadingData: true, error: null });
    try {
      const [t, prof, trees] = await Promise.all([
        getOrCreatePrimaryTree(userId),
        getProfile(),
        listTrees(),
      ]);
      const [p, r] = await Promise.all([listPeople(t.id), listRelationships(t.id)]);
      set({ tree: t, profile: prof, people: p, relationships: r, allTrees: trees });
      // Build cross-tree search index (non-blocking)
      get().rebuildSearchIndex();
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load tree data' });
    } finally {
      set({ loadingData: false });
    }
  },

  refreshData: async () => {
    const { tree } = get();
    if (!tree) return;
    try {
      const [p, r, prof] = await Promise.all([
        listPeople(tree.id),
        listRelationships(tree.id),
        getProfile(),
      ]);
      set({ people: p, relationships: r, profile: prof });
      get().rebuildSearchIndex();
    } catch (e: any) {
      console.error('Refresh failed:', e);
    }
  },

  // ─── Profile ───
  completeProfile: async (data) => {
    const updated = await updateProfileApi({ ...data, profile_completed: true });
    set({ profile: updated });
  },

  skipProfile: async () => {
    const updated = await updateProfileApi({ profile_completed: true });
    set({ profile: updated });
  },

  updateProfile: async (updates) => {
    const updated = await updateProfileApi(updates);
    set({ profile: updated });
  },

  // ─── Canvas operations ───
  clearCanvas: async () => {
    const { tree } = get();
    if (!tree) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete ALL people? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('people').delete().eq('tree_id', tree.id);
      if (error) throw error;

      set({ people: [], relationships: [] });
      useUIStore.getState().selectPerson(null);
      useUIStore.getState().expandAll();
    } catch (err: any) {
      console.error('Error clearing canvas:', err);
      alert('Failed to clear canvas: ' + (err?.message ?? 'Unknown error'));
    }
  },

  // ─── Capacity checks ───
  isAtCapacity: () => {
    const { people, profile } = get();
    const limit = profile?.leaf_capacity ?? 100;
    return people.length >= limit;
  },

  /** Returns true if at capacity (and opens upgrade modal). Returns false if OK to add. */
  checkCapacityAndBlock: () => {
    const { people, profile } = get();
    const limit = profile?.leaf_capacity ?? 100;
    if (people.length >= limit) {
      useUIStore.getState().openUpgrade('leaf_capacity');
      return true; // blocked
    }
    return false; // OK
  },

  // ─── Multi-tree operations ───
  switchTree: async (treeId) => {
    const { allTrees } = get();
    const target = allTrees.find((t) => t.id === treeId);
    if (!target) return;

    set({ loadingData: true, error: null });
    try {
      const [p, r] = await Promise.all([listPeople(treeId), listRelationships(treeId)]);
      set({ tree: target, people: p, relationships: r });
      useUIStore.getState().selectPerson(null);
      useUIStore.getState().expandAll();
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to switch tree' });
    } finally {
      set({ loadingData: false });
    }
  },

  createNewTree: async (name) => {
    const { allTrees } = get();

    // Free tier check: only 1 tree allowed
    if (allTrees.length >= FREE_TREE_LIMIT) {
      useUIStore.getState().openUpgrade('multi_tree');
      return;
    }

    try {
      const newTree = await createTree(name);
      const updatedTrees = [...allTrees, newTree];
      set({ tree: newTree, allTrees: updatedTrees, people: [], relationships: [] });
      useUIStore.getState().selectPerson(null);
      useUIStore.getState().expandAll();
    } catch (e: any) {
      alert('Failed to create tree: ' + (e?.message ?? 'Unknown error'));
    }
  },

  renameCurrentTree: async (newName) => {
    const { tree, allTrees } = get();
    if (!tree) return;

    try {
      const updated = await renameTreeApi(tree.id, newName);
      set({
        tree: updated,
        allTrees: allTrees.map((t) => (t.id === tree.id ? updated : t)),
      });
      get().rebuildSearchIndex();
    } catch (e: any) {
      alert('Failed to rename tree: ' + (e?.message ?? 'Unknown error'));
    }
  },

  deleteCurrentTree: async () => {
    const { tree, allTrees } = get();
    if (!tree) return;
    if (allTrees.length <= 1) {
      alert('Cannot delete your only tree.');
      return;
    }

    const confirmed = window.confirm(
      `Delete "${tree.name}" and all its people? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteTreeApi(tree.id);
      const remaining = allTrees.filter((t) => t.id !== tree.id);
      const nextTree = remaining[0];

      const [p, r] = await Promise.all([
        listPeople(nextTree.id),
        listRelationships(nextTree.id),
      ]);

      set({
        tree: nextTree,
        allTrees: remaining,
        people: p,
        relationships: r,
      });
      useUIStore.getState().selectPerson(null);
      get().rebuildSearchIndex();
      useUIStore.getState().expandAll();
    } catch (e: any) {
      alert('Failed to delete tree: ' + (e?.message ?? 'Unknown error'));
    }
  },

  // ─── CRUD operations (with capacity check) ───

  addPerson: async (formData) => {
    const { tree } = get();
    if (!tree) throw new Error('No tree loaded');
    if (get().checkCapacityAndBlock()) return;

    const newPerson = await createPerson({
      tree_id: tree.id,
      name: formData.name,
      native_script_name: formData.native_script_name,
      gender: formData.gender || null,
      birth_date: formData.birth_date_unknown ? null : formData.birth_date,
      birth_date_unknown: formData.birth_date_unknown,
      location: formData.location,
      notes: formData.notes,
      is_adopted: formData.is_adopted,
      is_deceased: formData.is_deceased,
      death_date: formData.death_date,
      photo_url: formData.photo_url,
      is_bloodline: true,
    });

    await get().refreshData();
    useUIStore.getState().closeModal();
    useUIStore.getState().selectPerson(newPerson.id);
    useUIStore.getState().focusPerson(newPerson.id);
  },

  addPartner: async (formData) => {
    const { tree } = get();
    const selectedPerson = getSelectedPerson(get().people);
    if (!tree || !selectedPerson) throw new Error('No tree or person selected');
    if (get().checkCapacityAndBlock()) return;

    const newPerson = await createPerson({
      tree_id: tree.id,
      name: formData.name,
      native_script_name: formData.native_script_name,
      gender: formData.gender || null,
      birth_date: formData.birth_date_unknown ? null : formData.birth_date,
      birth_date_unknown: formData.birth_date_unknown,
      location: formData.location,
      notes: formData.notes,
      is_adopted: formData.is_adopted,
      is_deceased: formData.is_deceased,
      death_date: formData.death_date,
      photo_url: formData.photo_url,
      is_bloodline: false,
    });

    await createRelationship({
      tree_id: tree.id,
      person_a_id: selectedPerson.id,
      person_b_id: newPerson.id,
      relationship_type: 'partner',
      relationship_status: 'current',
    });

    await get().refreshData();
    useUIStore.getState().closeModal();
    useUIStore.getState().selectPerson(newPerson.id);
    useUIStore.getState().focusPerson(newPerson.id);
  },

  addChild: async (formData, otherParentId) => {
    const { tree } = get();
    const selectedPerson = getSelectedPerson(get().people);
    if (!tree || !selectedPerson) throw new Error('No tree or person selected');
    if (get().checkCapacityAndBlock()) return;

    const newPerson = await createPerson({
      tree_id: tree.id,
      name: formData.name,
      native_script_name: formData.native_script_name,
      gender: formData.gender || null,
      birth_date: formData.birth_date_unknown ? null : formData.birth_date,
      birth_date_unknown: formData.birth_date_unknown,
      location: formData.location,
      notes: formData.notes,
      is_adopted: formData.is_adopted,
      is_deceased: formData.is_deceased,
      death_date: formData.death_date,
      photo_url: formData.photo_url,
      is_bloodline: true,
    });

    await createRelationship({
      tree_id: tree.id,
      person_a_id: selectedPerson.id,
      person_b_id: newPerson.id,
      relationship_type: 'parent_child',
      parent_type: formData.is_adopted ? 'adoptive' : 'biological',
    });

    if (otherParentId) {
      await createRelationship({
        tree_id: tree.id,
        person_a_id: otherParentId,
        person_b_id: newPerson.id,
        relationship_type: 'parent_child',
        parent_type: formData.is_adopted ? 'adoptive' : 'biological',
      });
    }

    await get().refreshData();
    useUIStore.getState().closeModal();
    useUIStore.getState().selectPerson(newPerson.id);
    useUIStore.getState().focusPerson(newPerson.id);
  },

  addSibling: async (formData) => {
    const { tree, relationships } = get();
    const selectedPerson = getSelectedPerson(get().people);
    if (!tree || !selectedPerson) throw new Error('No tree or person selected');
    if (get().checkCapacityAndBlock()) return;

    const newPerson = await createPerson({
      tree_id: tree.id,
      name: formData.name,
      native_script_name: formData.native_script_name,
      gender: formData.gender || null,
      birth_date: formData.birth_date_unknown ? null : formData.birth_date,
      birth_date_unknown: formData.birth_date_unknown,
      location: formData.location,
      notes: formData.notes,
      is_adopted: formData.is_adopted,
      is_deceased: formData.is_deceased,
      death_date: formData.death_date,
      photo_url: formData.photo_url,
      is_bloodline: true,
    });

    const parentRels = relationships.filter(
      (r) => r.relationship_type === 'parent_child' && r.person_b_id === selectedPerson.id
    );

    for (const parentRel of parentRels) {
      await createRelationship({
        tree_id: tree.id,
        person_a_id: parentRel.person_a_id,
        person_b_id: newPerson.id,
        relationship_type: 'parent_child',
        parent_type: formData.is_adopted ? 'adoptive' : 'biological',
      });
    }

    await get().refreshData();
    useUIStore.getState().closeModal();
    useUIStore.getState().selectPerson(newPerson.id);
    useUIStore.getState().focusPerson(newPerson.id);
  },

  addParent: async (formData) => {
    const { tree, people, relationships } = get();
    const selectedPerson = getSelectedPerson(people);
    if (!tree || !selectedPerson) throw new Error('No tree or person selected');
    if (get().checkCapacityAndBlock()) return;

    // Handle bloodline flipping if adding parent to a non-bloodline person
    if (!selectedPerson.is_bloodline) {
      await updatePerson(selectedPerson.id, { is_bloodline: true });

      const partnerRels = relationships.filter(
        (r) =>
          r.relationship_type === 'partner' &&
          (r.person_a_id === selectedPerson.id || r.person_b_id === selectedPerson.id)
      );
      for (const rel of partnerRels) {
        const partnerId =
          rel.person_a_id === selectedPerson.id ? rel.person_b_id : rel.person_a_id;
        const partner = people.find((p) => p.id === partnerId);
        if (partner?.is_bloodline) {
          await updatePerson(partnerId, { is_bloodline: false });
        }
      }
    }

    const newPerson = await createPerson({
      tree_id: tree.id,
      name: formData.name,
      native_script_name: formData.native_script_name,
      gender: formData.gender || null,
      birth_date: formData.birth_date_unknown ? null : formData.birth_date,
      birth_date_unknown: formData.birth_date_unknown,
      location: formData.location,
      notes: formData.notes,
      is_adopted: formData.is_adopted,
      is_deceased: formData.is_deceased,
      death_date: formData.death_date,
      photo_url: formData.photo_url,
      is_bloodline: true,
    });

    await createRelationship({
      tree_id: tree.id,
      person_a_id: newPerson.id,
      person_b_id: selectedPerson.id,
      relationship_type: 'parent_child',
      parent_type: 'biological',
    });

    await get().refreshData();
    useUIStore.getState().closeModal();
    useUIStore.getState().selectPerson(newPerson.id);
    useUIStore.getState().focusPerson(newPerson.id);
  },

  linkParent: async (existingPersonId) => {
    const { tree } = get();
    const selectedPerson = getSelectedPerson(get().people);
    if (!tree || !selectedPerson) return;

    await createRelationship({
      tree_id: tree.id,
      person_a_id: existingPersonId,
      person_b_id: selectedPerson.id,
      relationship_type: 'parent_child',
      parent_type: 'biological',
    });

    await get().refreshData();
  },

  editPerson: async (formData) => {
    const { relationships } = get();
    const selectedPerson = getSelectedPerson(get().people);
    if (!selectedPerson) throw new Error('No person selected');

    const wasPreviouslyDeceased = !!selectedPerson.is_deceased;
    const isNowDeceased = !!formData.is_deceased;

    await updatePerson(selectedPerson.id, {
      name: formData.name,
      native_script_name: formData.native_script_name || null,
      gender: formData.gender || null,
      birth_date: formData.birth_date_unknown ? null : formData.birth_date,
      birth_date_unknown: formData.birth_date_unknown,
      location: formData.location || null,
      notes: formData.notes || null,
      is_adopted: formData.is_adopted,
      is_deceased: formData.is_deceased,
      death_date: formData.is_deceased ? formData.death_date : null,
      photo_url: formData.photo_url ?? null,
    });

    // Auto-update partner relationship status if deceased status changed
    if (isNowDeceased !== wasPreviouslyDeceased) {
      const partnerRels = relationships.filter(
        (r) =>
          r.relationship_type === 'partner' &&
          (r.person_a_id === selectedPerson.id || r.person_b_id === selectedPerson.id)
      );

      if (isNowDeceased) {
        for (const rel of partnerRels) {
          if (rel.relationship_status === 'current') {
            await updateRelationship(rel.id, { relationship_status: 'deceased' });
          }
        }
      } else {
        for (const rel of partnerRels) {
          if (rel.relationship_status === 'deceased') {
            await updateRelationship(rel.id, { relationship_status: 'current' });
          }
        }
      }
    }

    await get().refreshData();
    useUIStore.getState().closeModal();
  },

  removePerson: async () => {
    const { people, relationships } = get();
    const selectedPerson = getSelectedPerson(people);
    if (!selectedPerson) return;

    // Compute who would become disconnected if this person is deleted
    const floatingPeople = getFloatingPeople(selectedPerson.id, people, relationships);

    let confirmed: boolean;

    if (floatingPeople.length > 0) {
      // Build a readable list of names being cascade-deleted
      const nameList = floatingPeople.map((p) => `  • ${p.name}`).join('\n');
      confirmed = confirm(
        `Deleting ${selectedPerson.name} will also remove ${floatingPeople.length} family member${floatingPeople.length === 1 ? '' : 's'} who ${floatingPeople.length === 1 ? 'is' : 'are'} only connected through them:\n\n${nameList}\n\nThis cannot be undone. Continue?`
      );
    } else {
      confirmed = confirm(
        `Are you sure you want to delete ${selectedPerson.name}? This will also remove all their relationships.`
      );
    }

    if (!confirmed) return;

    try {
      // Delete floating people first (they reference the main person via relationships)
      for (const fp of floatingPeople) {
        await deletePerson(fp.id);
      }
      // Delete the selected person
      await deletePerson(selectedPerson.id);
      await get().refreshData();
      useUIStore.getState().selectPerson(null);
    } catch (e: any) {
      alert('Failed to delete: ' + (e?.message ?? 'Unknown error'));
    }
  },

  // ─── Relationship operations ───
  updatePartnerStatus: async (relationshipId, newStatus) => {
    try {
      await updateRelationship(relationshipId, { relationship_status: newStatus });
      await get().refreshData();
    } catch (e: any) {
      alert('Failed to update status: ' + (e?.message ?? 'Unknown error'));
    }
  },

  changeParent: async (newParentId) => {
    const { tree, relationships } = get();
    const { changeParentContext } = useUIStore.getState();
    if (!tree || !changeParentContext) return;

    const { childId, oldParentId } = changeParentContext;

    try {
      const oldRel = relationships.find(
        (r) =>
          r.relationship_type === 'parent_child' &&
          r.person_a_id === oldParentId &&
          r.person_b_id === childId
      );

      if (!oldRel) {
        alert('Could not find the parent relationship to change.');
        return;
      }

      await deleteRelationship(oldRel.id);

      if (newParentId) {
        await createRelationship({
          tree_id: tree.id,
          person_a_id: newParentId,
          person_b_id: childId,
          relationship_type: 'parent_child',
          parent_type: 'biological',
        });
      }

      await get().refreshData();
      useUIStore.getState().closeModal();
    } catch (e: any) {
      alert('Failed to change parent: ' + (e?.message ?? 'Unknown error'));
    }
  },

  // ─── Helpers ───
  hasCurrentPartner: (personId) => {
    const { relationships } = get();
    return relationships.some(
      (r) =>
        r.relationship_type === 'partner' &&
        r.relationship_status === 'current' &&
        (r.person_a_id === personId || r.person_b_id === personId)
    );
  },

  getAllCollapsePairKeys: () => {
    const { relationships } = get();
    const parentChildRels = relationships.filter((r) => r.relationship_type === 'parent_child');
    const partnerRels = relationships.filter((r) => r.relationship_type === 'partner');

    const childParents = new Map<string, Set<string>>();
    for (const rel of parentChildRels) {
      if (!childParents.has(rel.person_b_id)) childParents.set(rel.person_b_id, new Set());
      childParents.get(rel.person_b_id)!.add(rel.person_a_id);
    }

    const personPartners = new Map<string, Set<string>>();
    for (const rel of partnerRels) {
      if (!personPartners.has(rel.person_a_id)) personPartners.set(rel.person_a_id, new Set());
      if (!personPartners.has(rel.person_b_id)) personPartners.set(rel.person_b_id, new Set());
      personPartners.get(rel.person_a_id)!.add(rel.person_b_id);
      personPartners.get(rel.person_b_id)!.add(rel.person_a_id);
    }

    const allPairKeys = new Set<string>();

    for (const [, parents] of childParents) {
      const parentArr = Array.from(parents);
      if (parentArr.length === 2) {
        const key = [parentArr[0], parentArr[1]].sort().join('_');
        allPairKeys.add(key);
      } else if (parentArr.length === 1) {
        const parentId = parentArr[0];
        const partners = personPartners.get(parentId);
        let foundCoParent = false;
        if (partners) {
          for (const partnerId of partners) {
            for (const [, cParents] of childParents) {
              if (cParents.has(parentId) && cParents.has(partnerId)) {
                foundCoParent = true;
                break;
              }
            }
            if (foundCoParent) break;
          }
        }
        if (!foundCoParent) {
          allPairKeys.add(`${parentId}_solo`);
        }
      }
    }

    return allPairKeys;
  },

  rebuildSearchIndex: async () => {
    const { allTrees } = get();
    if (allTrees.length === 0) return;
    try {
      const allEntries: SearchIndexEntry[] = [];
      // Fetch people from all trees in parallel
      const results = await Promise.all(
        allTrees.map((t) => listPeople(t.id).then((people) => ({ tree: t, people })))
      );
      for (const { tree: t, people: treePeople } of results) {
        for (const p of treePeople) {
          allEntries.push({
            id: p.id,
            name: p.name,
            location: p.current_location,
            treeId: t.id,
            treeName: t.name,
          });
        }
      }
      set({ searchIndex: allEntries });
    } catch (e) {
      console.error('Failed to rebuild search index:', e);
    }
  },
}));

export default useTreeStore;
