// lib/layout-algorithms/utils.ts
import type { Person, Relationship, UUID } from "@/types/database";

/**
 * Parent metadata per Algorithm Fixes (Fix 4): parent links store metadata.
 * - parentType: 'biological' | 'adoptive' | null
 * - isPrimaryParentSet: boolean
 */
export type ParentLink = {
  parentId: UUID;
  parentType: Relationship["parent_type"]; // 'biological' | 'adoptive' | null
  isPrimaryParentSet: boolean;
};

export type RelationshipGraph = {
  peopleById: Map<UUID, Person>;

  // childId -> [{ parentId, parentType, isPrimaryParentSet }, ...]
  parentsByChild: Map<UUID, ParentLink[]>;

  // parentId -> set(childId)
  childrenByParent: Map<UUID, Set<UUID>>;

  // symmetric adjacency
  partnersByPerson: Map<UUID, Set<UUID>>;
  siblingsByPerson: Map<UUID, Set<UUID>>;
};

/**
 * Checklist 4.1: Build relationship graph adjacency lists. :contentReference[oaicite:4]{index=4}
 * Fix 4: store parent metadata objects (not just IDs). :contentReference[oaicite:5]{index=5}
 *
 * IMPORTANT: parent_child semantics are directed:
 *   person_a_id = parent
 *   person_b_id = child
 */
export function buildRelationshipGraph(
  people: Person[],
  relationships: Relationship[]
): RelationshipGraph {
  const peopleById = new Map<UUID, Person>();
  for (const p of people) peopleById.set(p.id, p);

  const parentsByChild = new Map<UUID, ParentLink[]>();
  const childrenByParent = new Map<UUID, Set<UUID>>();
  const partnersByPerson = new Map<UUID, Set<UUID>>();
  const siblingsByPerson = new Map<UUID, Set<UUID>>();

  const addToSetMap = (map: Map<UUID, Set<UUID>>, key: UUID, value: UUID) => {
    const set = map.get(key) ?? new Set<UUID>();
    set.add(value);
    map.set(key, set);
  };

  const addParentLink = (childId: UUID, link: ParentLink) => {
    const arr = parentsByChild.get(childId) ?? [];
    arr.push(link);
    parentsByChild.set(childId, arr);
  };

  for (const r of relationships) {
    if (r.relationship_type === "partner") {
      addToSetMap(partnersByPerson, r.person_a_id, r.person_b_id);
      addToSetMap(partnersByPerson, r.person_b_id, r.person_a_id);
      continue;
    }

    if (r.relationship_type === "sibling") {
      addToSetMap(siblingsByPerson, r.person_a_id, r.person_b_id);
      addToSetMap(siblingsByPerson, r.person_b_id, r.person_a_id);
      continue;
    }

    if (r.relationship_type === "parent_child") {
      const parentId = r.person_a_id;
      const childId = r.person_b_id;

      addToSetMap(childrenByParent, parentId, childId);

      addParentLink(childId, {
        parentId,
        parentType: r.parent_type ?? null,
        isPrimaryParentSet: !!r.is_primary_parent_set,
      });
    }
  }

  return {
    peopleById,
    parentsByChild,
    childrenByParent,
    partnersByPerson,
    siblingsByPerson,
  };
}

/**
 * Fix 4 + Spec: Each child is anchored under exactly one primary parent set:
 * 1) explicit is_primary_parent_set if present
 * 2) else adoptive set if present
 * 3) else biological set
 * 4) else any known parent(s) :contentReference[oaicite:6]{index=6}
 */
export function getPrimaryParentSet(
  childId: UUID,
  graph: RelationshipGraph
): { parentType: "adoptive" | "biological" | "unknown"; parentIds: UUID[] } | null {
  const links = graph.parentsByChild.get(childId) ?? [];
  if (links.length === 0) return null;

  const uniqueSorted = (ids: UUID[]) =>
    Array.from(new Set(ids)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  // 1) Explicit primary flags win
  const explicit = links.filter((l) => l.isPrimaryParentSet);
  if (explicit.length > 0) {
    const ids = uniqueSorted(explicit.map((l) => l.parentId));
    const types = new Set(explicit.map((l) => l.parentType ?? "unknown"));
    const parentType =
      types.size === 1 && (types.has("adoptive") || types.has("biological"))
        ? (Array.from(types)[0] as "adoptive" | "biological")
        : "unknown";
    return { parentType, parentIds: ids };
  }

  // 2) Adoptive set
  const adoptive = links.filter((l) => l.parentType === "adoptive").map((l) => l.parentId);
  if (adoptive.length > 0) return { parentType: "adoptive", parentIds: uniqueSorted(adoptive) };

  // 3) Biological set
  const biological = links.filter((l) => l.parentType === "biological").map((l) => l.parentId);
  if (biological.length > 0) return { parentType: "biological", parentIds: uniqueSorted(biological) };

  // 4) Unknown / fallback: any
  return { parentType: "unknown", parentIds: uniqueSorted(links.map((l) => l.parentId)) };
}

/**
 * Spec: Collapse hides all descendants reachable downward via child edges. :contentReference[oaicite:7]{index=7}
 * Checklist 4.1: implement getAllDescendants(). :contentReference[oaicite:8]{index=8}
 */
export function getAllDescendants(personId: UUID, graph: RelationshipGraph): Set<UUID> {
  const visited = new Set<UUID>();
  const stack: UUID[] = [];

  const directChildren = graph.childrenByParent.get(personId);
  if (directChildren) for (const c of directChildren) stack.push(c);

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const kids = graph.childrenByParent.get(current);
    if (kids) for (const k of kids) if (!visited.has(k)) stack.push(k);
  }

  return visited;
}

/**
 * Make a canonical pair key from two parent IDs (or one parent for solo children).
 * Used as the key in collapsedIds to enable per-couple collapse.
 */
export function makePairKey(parentA: UUID, parentB?: UUID): string {
  if (!parentB) return `${parentA}_solo`;
  return [parentA, parentB].sort().join('_');
}

/**
 * Get children shared between two specific parents.
 */
export function getSharedChildren(parentA: UUID, parentB: UUID, graph: RelationshipGraph): UUID[] {
  const childrenA = graph.childrenByParent.get(parentA) || new Set<UUID>();
  const childrenB = graph.childrenByParent.get(parentB) || new Set<UUID>();
  const shared: UUID[] = [];
  for (const childId of childrenA) {
    if (childrenB.has(childId)) shared.push(childId);
  }
  return shared;
}

/**
 * Get solo children of a parent (children that don't have any other known parent).
 */
export function getSoloChildren(parentId: UUID, graph: RelationshipGraph): UUID[] {
  const children = graph.childrenByParent.get(parentId) || new Set<UUID>();
  const solo: UUID[] = [];
  for (const childId of children) {
    const parentLinks = graph.parentsByChild.get(childId) || [];
    if (parentLinks.length <= 1) {
      solo.push(childId);
    }
  }
  return solo;
}

/**
 * Per-couple collapse: collapsedPairKeys contains pair keys like "parentA_parentB" or "parentA_solo".
 * Only hides children of that specific pair (+ all their descendants and their partners).
 */
export function getVisiblePeople(
  people: Person[],
  graph: RelationshipGraph,
  collapsedPairKeys: Set<string>
): Person[] {
  const hidden = new Set<UUID>();
  const allPeopleIds = new Set(people.map(p => p.id));

  // Step 1: Hide direct children and their descendants for each collapsed pair
  for (const pairKey of collapsedPairKeys) {
    const parts = pairKey.split('_');
    let childrenToHide: UUID[] = [];

    if (parts.length === 2 && parts[1] === 'solo') {
      // Solo parent collapse
      childrenToHide = getSoloChildren(parts[0], graph);
    } else if (parts.length === 2) {
      // Pair collapse: hide only shared children
      childrenToHide = getSharedChildren(parts[0], parts[1], graph);
    }

    for (const childId of childrenToHide) {
      hidden.add(childId);
      for (const d of getAllDescendants(childId, graph)) hidden.add(d);
    }
  }

  // Step 2: Also hide partners of hidden people (they'd float as orphan roots).
  // Iterate until stable since hiding a partner may expose more descendants/partners.
  let changed = true;
  while (changed) {
    changed = false;
    for (const hiddenId of hidden) {
      const partners = graph.partnersByPerson.get(hiddenId);
      if (!partners) continue;
      for (const partnerId of partners) {
        if (hidden.has(partnerId) || !allPeopleIds.has(partnerId)) continue;
        // Only hide this partner if ALL their connections lead to hidden people.
        // Check: does this partner have any visible parent? If so, they're anchored elsewhere.
        const parentLinks = graph.parentsByChild.get(partnerId) ?? [];
        const hasVisibleParent = parentLinks.some(link => !hidden.has(link.parentId) && allPeopleIds.has(link.parentId));
        if (hasVisibleParent) continue;

        // Partner is only connected through hidden people — hide them too
        hidden.add(partnerId);
        // Also hide their descendants
        for (const d of getAllDescendants(partnerId, graph)) {
          if (!hidden.has(d)) {
            hidden.add(d);
          }
        }
        changed = true;
      }
    }
  }

  return people.filter((p) => !hidden.has(p.id));
}

/**
 * Helpful stable ordering (Spec): unknown birthdates sort last; tie-break by creation_order.
 */
export function sortPeopleStable(people: Person[]): Person[] {
  return people.slice().sort((a, b) => {
    const aHasBirth = !!a.birth_date && !a.birth_date_unknown;
    const bHasBirth = !!b.birth_date && !b.birth_date_unknown;

    if (aHasBirth && bHasBirth && a.birth_date !== b.birth_date) {
      return a.birth_date! < b.birth_date! ? -1 : 1;
    }
    if (aHasBirth !== bHasBirth) return aHasBirth ? -1 : 1;

    const ao = a.creation_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.creation_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Convenience: parse year from "YYYY-MM-DD" safely.
 */
export function getBirthYear(person: Person): number | null {
  if (!person.birth_date || person.birth_date_unknown) return null;
  const year = Number(person.birth_date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}
