// lib/layout-algorithms/timeline.ts
import type { Person, UUID } from "@/types/database";
import type { RelationshipGraph } from "@/lib/layout-algorithms/utils";
import { getPrimaryParentSet, getVisiblePeople } from "@/lib/layout-algorithms/utils";

import {
  TIMELINE_YEAR_HEIGHT,
  TIMELINE_CHILD_YEARS_OFFSET,
  TIMELINE_GENERATION_BAND,
  LEAF_WIDTH,
  LEAF_HEIGHT,
  CANVAS_MARGIN_X,
  CANVAS_MARGIN_Y,
  TIMELINE_MIN_SIBLING_GAP,
  TIMELINE_PARTNER_GAP,
} from "@/lib/layout-algorithms/constants";

/**
 * Phase 4.2 (Checklist): Timeline Y positions
 * - calculateYPositions(): date-driven when birth_date is known
 * - deriveYFromRelatives(): for unknown dates, derive from relatives in priority order
 *
 * Fix 4: Use PRIMARY parent set for parent-based derivation.
 * Spec: deterministic offsets based on stable identifiers.
 */

export type YPositions = Map<UUID, number>;

function parseDateToMs(dateStr: string): number | null {
  // Supabase DATE arrives as "YYYY-MM-DD"
  // Use UTC parsing to avoid local timezone shifts.
  const ms = Date.parse(`${dateStr}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

function stableSmallOffset(person: Person): number {
  // Deterministic offset to avoid exact overlaps for unknown dates.
  // Keeps people within the same "generation band" visually.
  // Uses creation_order if present, else hashes id.
  const base = person.creation_order ?? hashStringToInt(person.id);
  // Range: [-TIMELINE_GENERATION_BAND/4, +TIMELINE_GENERATION_BAND/4] in small steps
  const steps = 7; // odd -> symmetric around 0
  const stepIndex = ((base % steps) + steps) % steps; // 0..6
  const centered = stepIndex - Math.floor(steps / 2); // -3..+3
  const stepSize = Math.max(2, Math.floor(TIMELINE_GENERATION_BAND / 12)); // small
  return centered * stepSize;
}

function hashStringToInt(s: string): number {
  // Simple deterministic hash
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Pseudocode Step 1–3: find earliest birth date, map known dates to y, derive unknowns.
 */
export function calculateYPositions(people: Person[], graph: RelationshipGraph): YPositions {
  const yPositions: YPositions = new Map();

  // Step 1: earliest known birth_date (ignore birth_date_unknown)
  let earliestMs: number | null = null;
  for (const person of people) {
    if (person.birth_date && !person.birth_date_unknown) {
      const ms = parseDateToMs(person.birth_date);
      if (ms !== null && (earliestMs === null || ms < earliestMs)) earliestMs = ms;
    }
  }

  // If no dates at all, use 1900-01-01 as reference (pseudocode)
  if (earliestMs === null) earliestMs = Date.parse("1900-01-01T00:00:00Z");

  // Step 2: assign Y for people with known birth dates
  for (const person of people) {
    if (person.birth_date && !person.birth_date_unknown) {
      const ms = parseDateToMs(person.birth_date);
      if (ms === null) continue;

      const yearsSinceEarliest = (ms - earliestMs) / (1000 * 60 * 60 * 24 * 365.25);
      const y = yearsSinceEarliest * TIMELINE_YEAR_HEIGHT;
      yPositions.set(person.id, y);
    }
  }

  // Step 3: derive Y for people with unknown birth dates
  const unknown = people.filter((p) => !p.birth_date || p.birth_date_unknown);

  // Deterministic processing order helps stability when chains of unknowns exist
  unknown.sort((a, b) => {
    const ao = a.creation_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.creation_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  for (const person of unknown) {
    const derived = deriveYFromRelatives(person, graph, yPositions);
    yPositions.set(person.id, derived);
  }

  return yPositions;
}

/**
 * Pseudocode strategies (in order): parents -> siblings -> partners -> children -> fallback.
 * Fix 4: parents strategy must use PRIMARY parent set.
 */
export function deriveYFromRelatives(
  person: Person,
  graph: RelationshipGraph,
  yPositions: YPositions
): number {
  const offset = stableSmallOffset(person);

  // Strategy 1: average of PRIMARY parents' Y + generation offset (~25 years below parents)
  const primaryParentSet = getPrimaryParentSet(person.id, graph);
  if (primaryParentSet && primaryParentSet.parentIds.length > 0) {
    const parentYs = primaryParentSet.parentIds
      .map((pid) => yPositions.get(pid))
      .filter((y): y is number => y !== undefined);

    if (parentYs.length > 0) {
      const avgParentY = parentYs.reduce((sum, y) => sum + y, 0) / parentYs.length;
      return avgParentY + TIMELINE_YEAR_HEIGHT * TIMELINE_CHILD_YEARS_OFFSET + offset;
    }
  }

  // Strategy 2: average of siblings' Y (same generation)
  const siblings = graph.siblingsByPerson.get(person.id);
  if (siblings && siblings.size > 0) {
    const sibYs = Array.from(siblings)
      .map((sid) => yPositions.get(sid))
      .filter((y): y is number => y !== undefined);

    if (sibYs.length > 0) {
      const avgSiblingY = sibYs.reduce((sum, y) => sum + y, 0) / sibYs.length;
      return avgSiblingY + offset;
    }
  }

  // Strategy 3: average of partners' Y (same generation)
  const partners = graph.partnersByPerson.get(person.id);
  if (partners && partners.size > 0) {
    const partnerYs = Array.from(partners)
      .map((pid) => yPositions.get(pid))
      .filter((y): y is number => y !== undefined);

    if (partnerYs.length > 0) {
      const avgPartnerY = partnerYs.reduce((sum, y) => sum + y, 0) / partnerYs.length;
      return avgPartnerY + offset;
    }
  }

  // Strategy 4: average of children's Y minus generation offset (~25 years above children)
  const children = graph.childrenByParent.get(person.id);
  if (children && children.size > 0) {
    const childYs = Array.from(children)
      .map((cid) => yPositions.get(cid))
      .filter((y): y is number => y !== undefined);

    if (childYs.length > 0) {
      const avgChildY = childYs.reduce((sum, y) => sum + y, 0) / childYs.length;
      return avgChildY - TIMELINE_YEAR_HEIGHT * TIMELINE_CHILD_YEARS_OFFSET + offset;
    }
  }

  // Fallback: 0 + small deterministic offset
  return 0 + offset;
}

// ---------------------------
// Phase 4.3: Family Units
// ---------------------------

export type FamilyUnit = {
  key: string; // stable signature for deduping
  parents: UUID[];
  children: UUID[];
  parentType: "primary"; // MVP: only primary parent sets create units (Fix 4/5)
};

/**
 * getSharedChildren(parents, graph)
 * Checklist 4.3 requires this helper.
 *
 * We implement it "correctly" for blended families by:
 * 1) intersecting child sets of all parents
 * 2) filtering to only children whose PRIMARY parent set exactly matches this parent set
 *
 * This prevents:
 * - single-parent set from accidentally swallowing children who have a second parent
 * - half-siblings from being grouped together incorrectly
 */
export function getSharedChildren(parentIds: UUID[], graph: RelationshipGraph): UUID[] {
  if (parentIds.length === 0) return [];

  const sortedParents = parentIds.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  // Start with first parent's children set
  const firstChildren = graph.childrenByParent.get(sortedParents[0]);
  if (!firstChildren || firstChildren.size === 0) return [];

  // Intersect with others
  let candidates = new Set<UUID>(firstChildren);
  for (let i = 1; i < sortedParents.length; i++) {
    const cset = graph.childrenByParent.get(sortedParents[i]) ?? new Set<UUID>();
    candidates = new Set(Array.from(candidates).filter((cid) => cset.has(cid)));
    if (candidates.size === 0) return [];
  }

  // Filter: only children whose *primary* parent set exactly equals this parent set
  const result: UUID[] = [];
  for (const childId of candidates) {
    const pset = getPrimaryParentSet(childId, graph);
    if (!pset) continue;
    if (arraysEqual(pset.parentIds, sortedParents)) result.push(childId);
  }

  // Deterministic ordering (fallback; final sorting happens in identifyFamilyUnits too)
  return result.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function arraysEqual(a: UUID[], b: UUID[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * identifyFamilyUnits(people, graph)
 * Checklist 4.3 requires this.
 *
 * Fix 5: Key units by parentSetSignature (and parentType if needed) instead of "processedChildren".
 *
 * MVP behavior: create units for PRIMARY parent sets only (secondary sets are edges, not separate units).
 */
export function identifyFamilyUnits(people: Person[], graph: RelationshipGraph): FamilyUnit[] {
  // parentSetKey -> { parents, children }
  const unitsMap = new Map<string, { parents: UUID[]; children: UUID[] }>();

  for (const child of people) {
    const primary = getPrimaryParentSet(child.id, graph);
    if (!primary || primary.parentIds.length === 0) continue;

    // Fix 5: signature-based units (prevents double counting in blended families)
    // Include parentType in key for extra safety (matches fix guidance).
    const key = `${primary.parentType}|${primary.parentIds.join(",")}`;

    const existing = unitsMap.get(key);
    if (!existing) {
      unitsMap.set(key, { parents: primary.parentIds.slice(), children: [child.id] });
    } else {
      existing.children.push(child.id);
    }
  }

  // Convert to array + sort deterministically
  const units: FamilyUnit[] = [];
  for (const [key, data] of unitsMap.entries()) {
    units.push({
      key,
      parents: data.parents,
      children: sortChildrenStable(data.children, graph),
      parentType: "primary",
    });
  }

  // Stable ordering of units: by earliest child creation_order (then key)
  units.sort((u1, u2) => {
    const a = minCreationOrder(u1.children, graph);
    const b = minCreationOrder(u2.children, graph);
    if (a !== b) return a - b;
    return u1.key < u2.key ? -1 : u1.key > u2.key ? 1 : 0;
  });

  return units;
}

/**
 * Children ordering rule (Spec):
 * - oldest→youngest by birth_date
 * - unknown birthdates last
 * - tie-break by creation_order
 */
function sortChildrenStable(childIds: UUID[], graph: RelationshipGraph): UUID[] {
  const byId = graph.peopleById;

  return childIds.slice().sort((aId, bId) => {
    const a = byId.get(aId);
    const b = byId.get(bId);

    // If missing people rows, fall back to id
    if (!a || !b) return aId < bId ? -1 : 1;

    const aKnown = !!a.birth_date && !a.birth_date_unknown;
    const bKnown = !!b.birth_date && !b.birth_date_unknown;

    if (aKnown && bKnown && a.birth_date !== b.birth_date) {
      return a.birth_date! < b.birth_date! ? -1 : 1; // earlier date = older
    }
    if (aKnown !== bKnown) return aKnown ? -1 : 1;

    const ao = a.creation_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.creation_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function minCreationOrder(childIds: UUID[], graph: RelationshipGraph): number {
  const byId = graph.peopleById;
  let min = Number.MAX_SAFE_INTEGER;
  for (const id of childIds) {
    const p = byId.get(id);
    const co = p?.creation_order ?? Number.MAX_SAFE_INTEGER;
    if (co < min) min = co;
  }
  return min;
}

// ---------------------------
// Phase 4.4: Timeline Layout (X positions)
// ---------------------------

export type LayoutPosition = {
  id: UUID;
  x: number;
  y: number;
};

/**
 * Phase 4.4: Timeline Layout (X positions)
 * Pseudocode reference: Timeline X assignment + horizontal collision avoidance
 */
export function timelineLayout(
  people: Person[],
  graph: RelationshipGraph,
  yPositions: YPositions,
  collapsedIds: Set<UUID> = new Set()
): LayoutPosition[] {
  const visible = getVisiblePeople(people, graph, collapsedIds);
  const positions: LayoutPosition[] = [];
  
  // Track occupied X ranges at each Y level to avoid collisions
  const occupiedRanges: Map<number, Array<{ xStart: number; xEnd: number }>> = new Map();
  
  // Sort people by Y position (top to bottom)
  const sorted = visible.slice().sort((a, b) => {
    const yA = yPositions.get(a.id) ?? 0;
    const yB = yPositions.get(b.id) ?? 0;
    return yA - yB;
  });

  for (const person of sorted) {
    const y = yPositions.get(person.id) ?? 0;
    const x = findAvailableX(person.id, y, graph, positions, yPositions, occupiedRanges);
    
    positions.push({ id: person.id, x, y: y + CANVAS_MARGIN_Y });
    
    // Mark this X range as occupied
    const ranges = occupiedRanges.get(Math.floor(y / 10)) ?? [];
    ranges.push({ xStart: x - LEAF_WIDTH / 2, xEnd: x + LEAF_WIDTH / 2 });
    occupiedRanges.set(Math.floor(y / 10), ranges);
  }

  return positions;
}

/**
 * Find available X position considering:
 * 1. Partners should be horizontally adjacent
 * 2. Family units should be grouped
 * 3. Avoid collisions with same-Y-level people
 */
function findAvailableX(
  personId: UUID,
  y: number,
  graph: RelationshipGraph,
  existingPositions: LayoutPosition[],
  yPositions: YPositions,
  occupiedRanges: Map<number, Array<{ xStart: number; xEnd: number }>>
): number {
  // Strategy: Try to position near partners or parents
  const partners = graph.partnersByPerson.get(personId);
  if (partners && partners.size > 0) {
    for (const partnerId of partners) {
      const partnerPos = existingPositions.find(p => p.id === partnerId);
      if (partnerPos) {
        // Try to place next to partner
        const candidateX = partnerPos.x + TIMELINE_PARTNER_GAP;
        if (isXAvailable(candidateX, y, occupiedRanges)) {
          return candidateX;
        }
      }
    }
  }

  // Try to position below parents (centered)
  const parentSet = getPrimaryParentSet(personId, graph);
  if (parentSet && parentSet.parentIds.length > 0) {
    const parentPositions = parentSet.parentIds
      .map(pid => existingPositions.find(p => p.id === pid))
      .filter((p): p is LayoutPosition => p !== undefined);
    
    if (parentPositions.length > 0) {
      const avgX = parentPositions.reduce((sum, p) => sum + p.x, 0) / parentPositions.length;
      if (isXAvailable(avgX, y, occupiedRanges)) {
        return avgX;
      }
    }
  }

  // Fallback: find first available X starting from left
  let testX = CANVAS_MARGIN_X;
  while (!isXAvailable(testX, y, occupiedRanges)) {
    testX += TIMELINE_MIN_SIBLING_GAP;
  }
  return testX;
}

function isXAvailable(
  x: number,
  y: number,
  occupiedRanges: Map<number, Array<{ xStart: number; xEnd: number }>>
): boolean {
  const yBucket = Math.floor(y / 10);
  const ranges = occupiedRanges.get(yBucket) ?? [];
  
  for (const range of ranges) {
    if (x + LEAF_WIDTH / 2 > range.xStart && x - LEAF_WIDTH / 2 < range.xEnd) {
      return false; // Collision
    }
  }
  return true;
}