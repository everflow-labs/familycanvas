// app/canvas/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import TreeCanvas from "@/components/canvas/TreeCanvas";
import Modal from "@/components/ui/Modal";
import PersonForm, { PersonFormData } from "@/components/forms/PersonForm";
import PersonDetailsPanel from "@/components/sidebars/PersonDetailsPanel";
import AddChildModal from "@/components/modals/AddChildModal";
import ChangeParentModal from "@/components/modals/ChangeParentModal";

import { getOrCreatePrimaryTree } from "@/lib/api/trees";
import { listPeople, createPerson, updatePerson, deletePerson } from "@/lib/api/people";
import {
  listRelationships,
  createRelationship,
  updateRelationship,
  deleteRelationship,
} from "@/lib/api/relationships";
import { supabase } from "@/lib/supabase/client";

import type { Person, Relationship, RelationshipType } from "@/types/database";

type TreeRow = {
  id: string;
  user_id: string;
  name: string;
  is_primary: boolean;
};

type ModalType =
  | 'add-person'
  | 'add-partner'
  | 'add-sibling'
  | 'add-parent'
  | 'add-child'
  | 'edit-person'
  | 'change-parent'
  | null;

export default function CanvasPage() {
  const { user, signOut } = useAuth();

  const [tree, setTree] = useState<TreeRow | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Change parent context
  const [changeParentContext, setChangeParentContext] = useState<{
    childId: string;
    oldParentId: string;
  } | null>(null);

  const userId = user?.id;

  // ─────────────────────────────────────────────────────────────────────
  // Load tree data
  // ─────────────────────────────────────────────────────────────────────

  const loadTreeData = useCallback(async () => {
    if (!userId) return;

    setLoadingData(true);
    setError(null);

    try {
      const t = await getOrCreatePrimaryTree(userId);
      setTree(t);

      const [p, r] = await Promise.all([listPeople(t.id), listRelationships(t.id)]);
      setPeople(p);
      setRelationships(r);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load tree data");
    } finally {
      setLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTreeData();
  }, [loadTreeData]);

  const selectedPerson = selectedPersonId
    ? people.find((p) => p.id === selectedPersonId)
    : null;

  // ─────────────────────────────────────────────────────────────────────
  // Helper: Check if person has a current partner
  // Since deceased partners have relationship_status='deceased' in DB,
  // we only need to check for status='current' — no partner lookup needed.
  // ─────────────────────────────────────────────────────────────────────

  const hasCurrentPartner = useCallback(
    (personId: string): boolean => {
      return relationships.some(
        (r) =>
          r.relationship_type === 'partner' &&
          r.relationship_status === 'current' &&
          (r.person_a_id === personId || r.person_b_id === personId)
      );
    },
    [relationships]
  );

  // ─────────────────────────────────────────────────────────────────────
  // Clear Canvas (delete all people)
  // ─────────────────────────────────────────────────────────────────────

  const handleClearCanvas = async () => {
    if (!tree) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete ALL people? This cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('people').delete().eq('tree_id', tree.id);

      if (error) throw error;

      setPeople([]);
      setRelationships([]);
      setSelectedPersonId(null);

      console.log('✅ Canvas cleared!');
    } catch (err: any) {
      console.error('Error clearing canvas:', err);
      alert('Failed to clear canvas: ' + (err?.message ?? 'Unknown error'));
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Modal handlers
  // ─────────────────────────────────────────────────────────────────────

  const closeModal = () => {
    setActiveModal(null);
    setChangeParentContext(null);
  };

  // Add first person (empty state)
  const handleOpenAddPerson = () => setActiveModal('add-person');

  // Add partner to selected person
  const handleOpenAddPartner = () => {
    if (!selectedPerson) return;

    if (hasCurrentPartner(selectedPerson.id)) {
      alert(
        'This person already has a current partner. Please change the existing partnership status first.'
      );
      return;
    }

    setActiveModal('add-partner');
  };

  // Add child - opens special modal
  const handleOpenAddChild = () => setActiveModal('add-child');

  // Add sibling
  const handleOpenAddSibling = () => {
    if (!selectedPerson) return;

    const hasParent = relationships.some(
      (r) => r.relationship_type === 'parent_child' && r.person_b_id === selectedPerson.id
    );

    if (!hasParent) {
      alert('Cannot add a sibling without a parent. Please add a parent first.');
      return;
    }

    setActiveModal('add-sibling');
  };

  // Add parent
  const handleOpenAddParent = () => setActiveModal('add-parent');

  // Edit person
  const handleOpenEditPerson = () => setActiveModal('edit-person');

  // Change parent
  const handleOpenChangeParent = (oldParentId: string) => {
    if (!selectedPerson) return;
    setChangeParentContext({ childId: selectedPerson.id, oldParentId });
    setActiveModal('change-parent');
  };

  // ─────────────────────────────────────────────────────────────────────
  // Quick Add handlers (from node click)
  // ─────────────────────────────────────────────────────────────────────

  const handleQuickAddChild = useCallback(
    (personId: string) => {
      setSelectedPersonId(personId);
      setActiveModal('add-child');
    },
    []
  );

  const handleQuickAddPartner = useCallback(
    (personId: string) => {
      if (hasCurrentPartner(personId)) {
        alert(
          'This person already has a current partner. Please change the existing partnership status first.'
        );
        return;
      }

      setSelectedPersonId(personId);
      setActiveModal('add-partner');
    },
    [hasCurrentPartner]
  );

  const handleQuickAddSibling = useCallback(
    (personId: string) => {
      const hasParent = relationships.some(
        (r) => r.relationship_type === 'parent_child' && r.person_b_id === personId
      );

      if (!hasParent) {
        alert('Cannot add a sibling without a parent. Please add a parent first.');
        return;
      }

      setSelectedPersonId(personId);
      setActiveModal('add-sibling');
    },
    [relationships]
  );

  const handleQuickAddParent = useCallback(
    (personId: string) => {
      const parentCount = relationships.filter(
        (r) => r.relationship_type === 'parent_child' && r.person_b_id === personId
      ).length;

      if (parentCount >= 2) {
        alert('This person already has 2 parents.');
        return;
      }

      setSelectedPersonId(personId);
      setActiveModal('add-parent');
    },
    [relationships]
  );

  // Toggle collapse/expand for branches
  const handleToggleCollapse = useCallback((pairKey: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pairKey)) {
        next.delete(pairKey);
      } else {
        next.add(pairKey);
      }
      return next;
    });
  }, []);

  const quickAddHandlers = useMemo(
    () => ({
      onAddChild: handleQuickAddChild,
      onAddPartner: handleQuickAddPartner,
      onAddSibling: handleQuickAddSibling,
      onAddParent: handleQuickAddParent,
    }),
    [handleQuickAddChild, handleQuickAddPartner, handleQuickAddSibling, handleQuickAddParent]
  );

  // ─────────────────────────────────────────────────────────────────────
  // Relationship editing handlers
  // ─────────────────────────────────────────────────────────────────────

  // Update partner relationship status (current ↔ divorced ↔ separated)
  const handleUpdatePartnerStatus = async (relationshipId: string, newStatus: string) => {
    try {
      await updateRelationship(relationshipId, { relationship_status: newStatus });
      await loadTreeData();
    } catch (e: any) {
      alert('Failed to update status: ' + (e?.message ?? 'Unknown error'));
    }
  };

  // Change parent: delete old parent-child rel, optionally create new one
  const handleChangeParent = async (newParentId: string | null) => {
    if (!tree || !changeParentContext) return;

    const { childId, oldParentId } = changeParentContext;

    try {
      // Find the old parent-child relationship
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

      // If setting to "Unknown" (null), just delete the old relationship
      // If selecting a new parent, delete old and create new
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

      await loadTreeData();
      closeModal();
    } catch (e: any) {
      alert('Failed to change parent: ' + (e?.message ?? 'Unknown error'));
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Auto-update partner relationship status when deceased status changes
  // ─────────────────────────────────────────────────────────────────────

  /**
   * When a person is marked as deceased:
   *   - Find all their partner relationships with status='current'
   *   - Update those relationships to status='deceased'
   *
   * When a person is un-marked as deceased (restored to alive):
   *   - Find all their partner relationships with status='deceased'
   *   - Restore those relationships to status='current'
   */
  const syncPartnerStatusForDeceased = async (
    personId: string,
    isNowDeceased: boolean,
    wasPreviouslyDeceased: boolean
  ) => {
    if (isNowDeceased === wasPreviouslyDeceased) return; // No change

    // Find partner relationships for this person
    const partnerRels = relationships.filter(
      (r) =>
        r.relationship_type === 'partner' &&
        (r.person_a_id === personId || r.person_b_id === personId)
    );

    if (isNowDeceased && !wasPreviouslyDeceased) {
      // Person just died: update 'current' partner relationships to 'deceased'
      for (const rel of partnerRels) {
        if (rel.relationship_status === 'current') {
          await updateRelationship(rel.id, { relationship_status: 'deceased' });
        }
      }
    } else if (!isNowDeceased && wasPreviouslyDeceased) {
      // Person restored to alive: update 'deceased' partner relationships back to 'current'
      for (const rel of partnerRels) {
        if (rel.relationship_status === 'deceased') {
          await updateRelationship(rel.id, { relationship_status: 'current' });
        }
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Form submission handlers
  // ─────────────────────────────────────────────────────────────────────

  // Helper to create a person from form data
  const createPersonFromForm = async (formData: PersonFormData, is_bloodline: boolean = true) => {
    if (!tree) throw new Error('No tree loaded');

    return createPerson({
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
      is_bloodline,
    });
  };

  // Add person (standalone, from empty state)
  const handleAddPerson = async (formData: PersonFormData) => {
    const newPerson = await createPersonFromForm(formData);
    await loadTreeData();
    closeModal();
    setSelectedPersonId(newPerson.id);
  };

  // Add partner
  const handleAddPartner = async (formData: PersonFormData) => {
    if (!tree || !selectedPerson) throw new Error('No tree or person selected');

    const newPerson = await createPersonFromForm(formData, false); // Partners are not bloodline

    await createRelationship({
      tree_id: tree.id,
      person_a_id: selectedPerson.id,
      person_b_id: newPerson.id,
      relationship_type: 'partner',
      relationship_status: 'current',
    });

    await loadTreeData();
    closeModal();
    setSelectedPersonId(newPerson.id);
  };

  // Add child (with other parent selection)
  const handleAddChild = async (formData: PersonFormData, otherParentId: string | null) => {
    if (!tree || !selectedPerson) throw new Error('No tree or person selected');

    const newPerson = await createPersonFromForm(formData);

    // Create parent-child relationship with selected person
    await createRelationship({
      tree_id: tree.id,
      person_a_id: selectedPerson.id,
      person_b_id: newPerson.id,
      relationship_type: 'parent_child',
      parent_type: formData.is_adopted ? 'adoptive' : 'biological',
    });

    // If other parent is known, create relationship with them too
    if (otherParentId) {
      await createRelationship({
        tree_id: tree.id,
        person_a_id: otherParentId,
        person_b_id: newPerson.id,
        relationship_type: 'parent_child',
        parent_type: formData.is_adopted ? 'adoptive' : 'biological',
      });
    }

    await loadTreeData();
    closeModal();
    setSelectedPersonId(newPerson.id);
  };

  // Add sibling (creates relationship with same parents)
  const handleAddSibling = async (formData: PersonFormData) => {
    if (!tree || !selectedPerson) throw new Error('No tree or person selected');

    const newPerson = await createPersonFromForm(formData);

    // Find parents of selected person
    const parentRels = relationships.filter(
      (r) => r.relationship_type === 'parent_child' && r.person_b_id === selectedPerson.id
    );

    // Create parent-child relationships with each parent
    for (const parentRel of parentRels) {
      await createRelationship({
        tree_id: tree.id,
        person_a_id: parentRel.person_a_id,
        person_b_id: newPerson.id,
        relationship_type: 'parent_child',
        parent_type: formData.is_adopted ? 'adoptive' : 'biological',
      });
    }

    await loadTreeData();
    closeModal();
    setSelectedPersonId(newPerson.id);
  };

  // Add parent (selected person becomes child of new person)
  const handleAddParent = async (formData: PersonFormData) => {
    if (!tree || !selectedPerson) throw new Error('No tree or person selected');

    // If adding parent to a non-bloodline person at the top, flip bloodline direction
    if (!selectedPerson.is_bloodline) {
      // Flip this person to bloodline
      await updatePerson(selectedPerson.id, { is_bloodline: true });

      // Find their partner(s) at the same level who are bloodline and flip them
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

    const newPerson = await createPersonFromForm(formData, true); // Parents are bloodline

    await createRelationship({
      tree_id: tree.id,
      person_a_id: newPerson.id,
      person_b_id: selectedPerson.id,
      relationship_type: 'parent_child',
      parent_type: 'biological',
    });

    await loadTreeData();
    closeModal();
    setSelectedPersonId(newPerson.id);
  };

  // Link an existing person as a parent (e.g., existing partner of an already-assigned parent)
  const handleLinkParent = async (existingPersonId: string) => {
    if (!tree || !selectedPerson) return;

    await createRelationship({
      tree_id: tree.id,
      person_a_id: existingPersonId,
      person_b_id: selectedPerson.id,
      relationship_type: 'parent_child',
      parent_type: 'biological',
    });

    await loadTreeData();
  };

  // Edit person
  const handleEditPerson = async (formData: PersonFormData) => {
    if (!selectedPerson) throw new Error('No person selected');

    const wasPreviouslyDeceased = !!selectedPerson.is_deceased;
    const isNowDeceased = !!formData.is_deceased;

    // Update the person record
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
    await syncPartnerStatusForDeceased(selectedPerson.id, isNowDeceased, wasPreviouslyDeceased);

    await loadTreeData();
    closeModal();
  };

  // Delete person
  const handleDeletePerson = async () => {
    if (!selectedPerson) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedPerson.name}? This will also remove all their relationships.`
      )
    ) {
      return;
    }

    try {
      await deletePerson(selectedPerson.id);
      await loadTreeData();
      setSelectedPersonId(null);
    } catch (e: any) {
      alert('Failed to delete: ' + (e?.message ?? 'Unknown error'));
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Change parent modal data
  // ─────────────────────────────────────────────────────────────────────

  const changeParentChild = changeParentContext
    ? people.find((p) => p.id === changeParentContext.childId)
    : null;

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b bg-white px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold">FamilyCanvas</div>
            {tree && <div className="text-sm text-gray-600">{tree.name}</div>}
          </div>
          <div className="flex items-center gap-4">
            {people.length > 0 && (
              <button
                onClick={handleClearCanvas}
                className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
              >
                🗑️ Clear All
              </button>
            )}
            <div className="text-sm text-gray-600">{user?.email}</div>
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() => signOut()}
            >
              Log out
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 bg-gray-50">
            {loadingData ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-600">Loading your family tree...</div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="text-sm font-medium text-red-800">Error</div>
                  <div className="mt-1 text-sm text-red-600">{error}</div>
                  <button
                    className="mt-3 text-sm text-red-700 underline hover:text-red-900"
                    onClick={() => window.location.reload()}
                  >
                    Reload page
                  </button>
                </div>
              </div>
            ) : people.length === 0 ? (
              <div className="flex h-full items-center justify-center p-4">
                <div className="max-w-lg w-full">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      Start your family tree
                    </h2>
                    <p className="mt-2 text-gray-500">
                      Pick one person as your starting point — you&apos;ll grow the tree outward from there.
                    </p>
                  </div>

                  {/* Starting point options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={handleOpenAddPerson}
                      className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-emerald-400 hover:shadow-md"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900">Start with yourself</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Add parents, siblings, and your own family from here
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleOpenAddPerson}
                      className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-emerald-400 hover:shadow-md"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 group-hover:bg-amber-100 transition-colors">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900">Start with a grandparent</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Build downward through the generations
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Tips */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Tips for building your tree</p>
                    <ul className="space-y-1.5 text-xs text-gray-500">
                      <li className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Click any person to add their partner, children, parents, or siblings
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Only the name is required — add details like dates and photos anytime
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        You can grow the tree upward (add parents) from the topmost generation
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <TreeCanvas
                people={people}
                relationships={relationships}
                onPersonSelect={setSelectedPersonId}
                quickAddHandlers={quickAddHandlers}
                collapsedIds={collapsedIds}
                onToggleCollapse={handleToggleCollapse}
              />
            )}
          </div>

          {/* Right sidebar - Person details */}
          {selectedPerson && (
            <PersonDetailsPanel
              person={selectedPerson}
              people={people}
              relationships={relationships}
              onClose={() => setSelectedPersonId(null)}
              onSelectPerson={setSelectedPersonId}
              onAddPartner={handleOpenAddPartner}
              onAddChild={handleOpenAddChild}
              onAddSibling={handleOpenAddSibling}
              onAddParent={handleOpenAddParent}
              onEdit={handleOpenEditPerson}
              onDelete={handleDeletePerson}
              onUpdatePartnerStatus={handleUpdatePartnerStatus}
              onChangeParent={handleOpenChangeParent}
              onLinkParent={handleLinkParent}
            />
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}

      {/* Add Person Modal (standalone) */}
      <Modal isOpen={activeModal === 'add-person'} onClose={closeModal} title="Add Person">
        <PersonForm onSubmit={handleAddPerson} onCancel={closeModal} />
      </Modal>

      {/* Add Partner Modal */}
      <Modal
        isOpen={activeModal === 'add-partner'}
        onClose={closeModal}
        title={`Add Partner for ${selectedPerson?.name || ''}`}
      >
        <PersonForm
          onSubmit={handleAddPartner}
          onCancel={closeModal}
          relationshipContext={
            selectedPerson
              ? {
                  type: 'partner',
                  relatedPersonId: selectedPerson.id,
                  relatedPersonName: selectedPerson.name,
                }
              : undefined
          }
          submitLabel="Add Partner"
        />
      </Modal>

      {/* Add Child Modal (with parent selection) */}
      {selectedPerson && (
        <AddChildModal
          isOpen={activeModal === 'add-child'}
          onClose={closeModal}
          parentPerson={selectedPerson}
          people={people}
          relationships={relationships}
          onSubmit={handleAddChild}
        />
      )}

      {/* Add Sibling Modal */}
      <Modal
        isOpen={activeModal === 'add-sibling'}
        onClose={closeModal}
        title={`Add Sibling of ${selectedPerson?.name || ''}`}
      >
        <PersonForm
          onSubmit={handleAddSibling}
          onCancel={closeModal}
          relationshipContext={
            selectedPerson
              ? {
                  type: 'sibling',
                  relatedPersonId: selectedPerson.id,
                  relatedPersonName: selectedPerson.name,
                }
              : undefined
          }
          submitLabel="Add Sibling"
        />
      </Modal>

      {/* Add Parent Modal */}
      <Modal
        isOpen={activeModal === 'add-parent'}
        onClose={closeModal}
        title={`Add Parent of ${selectedPerson?.name || ''}`}
      >
        <PersonForm
          onSubmit={handleAddParent}
          onCancel={closeModal}
          submitLabel="Add Parent"
        />
      </Modal>

      {/* Edit Person Modal */}
      <Modal
        isOpen={activeModal === 'edit-person'}
        onClose={closeModal}
        title={`Edit ${selectedPerson?.name || ''}`}
      >
        {selectedPerson && (
          <PersonForm
            onSubmit={handleEditPerson}
            onCancel={closeModal}
            initialData={{
              name: selectedPerson.name,
              native_script_name: selectedPerson.native_script_name || undefined,
              gender: (selectedPerson.gender as PersonFormData['gender']) || undefined,
              birth_date: selectedPerson.birth_date || undefined,
              birth_date_unknown: selectedPerson.birth_date_unknown || false,
              location: selectedPerson.location || undefined,
              notes: selectedPerson.notes || undefined,
              photo_url: selectedPerson.photo_url || undefined,
              is_adopted: selectedPerson.is_adopted || false,
              is_deceased: selectedPerson.is_deceased || false,
              death_date: selectedPerson.death_date || undefined,
            }}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Change Parent Modal */}
      {changeParentChild && changeParentContext && (
        <ChangeParentModal
          isOpen={activeModal === 'change-parent'}
          onClose={closeModal}
          childPerson={changeParentChild}
          currentParentId={changeParentContext.oldParentId}
          people={people}
          relationships={relationships}
          onSubmit={handleChangeParent}
        />
      )}
    </ProtectedRoute>
  );
}
