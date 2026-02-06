// lib/layout-algorithms/generation-layout.ts
/**
 * Generational Layout Algorithm for FamilyCanvas
 * 
 * APPROACH: Subtree-width propagation with multi-partner support
 * - Each person can have multiple partners (exes on LEFT, current on RIGHT)
 * - Children are grouped by their parent pair and positioned under the pair center
 * - Calculate FULL subtree bounds for each node (including all partners + child groups)
 * - Position siblings so their subtree bounds don't overlap
 *
 * PARTNER POSITIONING (relative to person at halfCol 0):
 *   Current partner:  +2
 *   Ex partners:      -2, -4, -6, ... (stacking leftward)
 *
 * PAIR CENTERS (midpoint between person and partner):
 *   Current pair:  +1
 *   Ex[0] pair:    -1
 *   Ex[1] pair:    -2
 *   Ex[2] pair:    -3
 *   Solo (no other parent): 0
 */

import type { Person, Relationship, UUID } from "@/types/database";
import type { RelationshipGraph } from "@/lib/layout-algorithms/utils";
import { getVisiblePeople, getPrimaryParentSet } from "@/lib/layout-algorithms/utils";

const HALF_CELL = 80;
const ROW_HEIGHT = 180;
const CANVAS_MARGIN = 300;
const MIN_SUBTREE_GAP = 0; // Subtrees can touch (bounds already include node width)
const MIN_GROUP_GAP = 2;  // Minimum gap between child groups from different partners (in half-cells)

export type LayoutPosition = {
  id: UUID;
  x: number;
  y: number;
};

type PartnerEntry = {
  person: Person;
  status: string;          // 'current' | 'divorced' | 'separated' | 'deceased'
  partnerHalfCol: number;  // Position relative to person (e.g. +2 for current, -2/-4 for exes)
  pairCenter: number;      // Midpoint between person and partner
  children: LayoutNode[];  // Children shared between person and this partner
};

type LayoutNode = {
  person: Person;
  partners: PartnerEntry[];   // All partners, ordered: exes (leftmost first), then current
  soloChildren: LayoutNode[]; // Children with no known other parent
  halfCol: number;
  row: number;
  // Subtree bounds relative to this node's halfCol
  subtreeLeft: number;   // How far left the subtree extends (negative)
  subtreeRight: number;  // How far right the subtree extends (positive)
};

// ─────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────

export function generationLayout(
  people: Person[],
  graph: RelationshipGraph,
  collapsedIds: Set<UUID> = new Set(),
  relationships: Relationship[] = []
): LayoutPosition[] {
  const visible = getVisiblePeople(people, graph, collapsedIds);
  if (visible.length === 0) return [];

  const processed = new Set<UUID>();
  const rootNodes: LayoutNode[] = [];

  const allRoots = visible.filter(p => {
    const parentSet = getPrimaryParentSet(p.id, graph);
    if (!parentSet || parentSet.parentIds.length === 0) return true;
    return !parentSet.parentIds.some(pid => visible.some(v => v.id === pid));
  });

  // Filter out roots that will be "claimed" as partners when a non-root person's
  // ancestor tree is built. A root is claimable if any of its partners is a non-root
  // (has visible parents), meaning that partner will be processed as a child node
  // in some ancestor's tree, and this root will be pulled in as their partner.
  const rootIdSet = new Set(allRoots.map(r => r.id));
  const roots = allRoots.filter(r => {
    const partnerIds = graph.partnersByPerson.get(r.id);
    if (!partnerIds || partnerIds.size === 0) return true; // No partners, stay as root

    for (const pid of partnerIds) {
      // If partner is NOT a root (has visible parents), this root will be claimed
      if (!rootIdSet.has(pid) && visible.some(v => v.id === pid)) {
        return false;
      }
    }
    return true;
  });

  console.log('🌱 ROOTS:', roots.map(r => r.name));

  for (const root of roots) {
    if (processed.has(root.id)) continue;
    const node = buildNode(root, visible, graph, relationships, processed);
    if (node) rootNodes.push(node);
  }

  if (rootNodes.length === 0) return [];

  // Phase 1: Calculate subtree bounds (bottom-up)
  for (const root of rootNodes) {
    calculateSubtreeBounds(root);
  }

  // Phase 2: Position trees with proper spacing
  let startHalfCol = 0;
  for (const root of rootNodes) {
    const offset = startHalfCol - root.subtreeLeft;
    positionTree(root, offset, 0);
    startHalfCol = offset + root.subtreeRight + 4; // gap between root trees
  }

  // Phase 3: Collect final positions
  const positions: LayoutPosition[] = [];
  collectPositions(rootNodes, positions);

  for (const pos of positions) {
    const p = visible.find(v => v.id === pos.id);
    console.log(`📍 ${p?.name}: halfCol=${(pos.x - CANVAS_MARGIN) / HALF_CELL}, row=${(pos.y - CANVAS_MARGIN) / ROW_HEIGHT}`);
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────
// Build node with multi-partner support
// ─────────────────────────────────────────────────────────────────────

function buildNode(
  person: Person,
  allPeople: Person[],
  graph: RelationshipGraph,
  relationships: Relationship[],
  processed: Set<UUID>,
): LayoutNode | null {
  if (processed.has(person.id)) return null;
  processed.add(person.id);

  // ── Collect all partners with status ──────────────────────────────
  const partnerIds = graph.partnersByPerson.get(person.id);
  const partnerEntries: PartnerEntry[] = [];

  if (partnerIds) {
    // Find partner relationships with status from raw relationships
    const partnerRels: { partnerId: UUID; status: string }[] = [];

    for (const rel of relationships) {
      if (rel.relationship_type !== 'partner') continue;

      let partnerId: UUID | null = null;
      if (rel.person_a_id === person.id) partnerId = rel.person_b_id;
      else if (rel.person_b_id === person.id) partnerId = rel.person_a_id;
      if (!partnerId) continue;

      // Only include if partner is in visible people and not already processed
      if (!allPeople.some(p => p.id === partnerId)) continue;

      partnerRels.push({
        partnerId,
        status: rel.relationship_status || 'current',
      });
    }

    // Separate current from exes
    const currentRel = partnerRels.find(r => r.status === 'current');
    const exRels = partnerRels.filter(r => r.status !== 'current');

    // Build ex partner entries (positioned left: -2, -4, -6, ...)
    let exPlacedCount = 0;
    for (let i = 0; i < exRels.length; i++) {
      const exRel = exRels[i];
      const partnerPerson = allPeople.find(p => p.id === exRel.partnerId);
      if (!partnerPerson) continue;

      // Skip if this partner was already placed by another node (e.g. ex remarried)
      if (processed.has(partnerPerson.id)) continue;

      // Mark partner as processed so they don't appear as separate root
      processed.add(partnerPerson.id);

      const partnerHalfCol = -2 - (exPlacedCount * 2);
      const pairCenter = partnerHalfCol / 2; // midpoint of 0 and partnerHalfCol

      partnerEntries.push({
        person: partnerPerson,
        status: exRel.status,
        partnerHalfCol,
        pairCenter,
        children: [], // Filled below
      });

      exPlacedCount++;
    }

    // Build current partner entry (positioned right: +2)
    if (currentRel) {
      const partnerPerson = allPeople.find(p => p.id === currentRel.partnerId);
      if (partnerPerson && !processed.has(partnerPerson.id)) {
        processed.add(partnerPerson.id);

        partnerEntries.push({
          person: partnerPerson,
          status: 'current',
          partnerHalfCol: 2,
          pairCenter: 1,
          children: [], // Filled below
        });
      }
    }
  }

  // ── Group children by parent pair ─────────────────────────────────
  const myChildIds = graph.childrenByParent.get(person.id) || new Set<UUID>();
  const assignedChildren = new Set<UUID>();

  // For each partner, find shared children
  for (const entry of partnerEntries) {
    const partnerChildIds = graph.childrenByParent.get(entry.person.id) || new Set<UUID>();

    // Shared children = intersection of my children and partner's children
    const sharedIds: UUID[] = [];
    for (const childId of myChildIds) {
      if (partnerChildIds.has(childId)) {
        sharedIds.push(childId);
        assignedChildren.add(childId);
      }
    }

    // Sort children by birth date / creation order
    const sorted = sortChildren(sharedIds, allPeople);

    // Recursively build child nodes
    for (const child of sorted) {
      const childNode = buildNode(child, allPeople, graph, relationships, processed);
      if (childNode) entry.children.push(childNode);
    }
  }

  // Solo children: my children not assigned to any partner
  const soloChildIds: UUID[] = [];
  for (const childId of myChildIds) {
    if (!assignedChildren.has(childId)) {
      soloChildIds.push(childId);
    }
  }

  const sortedSolo = sortChildren(soloChildIds, allPeople);
  const soloChildren: LayoutNode[] = [];
  for (const child of sortedSolo) {
    const childNode = buildNode(child, allPeople, graph, relationships, processed);
    if (childNode) soloChildren.push(childNode);
  }

  const node: LayoutNode = {
    person,
    partners: partnerEntries,
    soloChildren,
    halfCol: 0,
    row: 0,
    subtreeLeft: 0,
    subtreeRight: 0,
  };

  const partnerNames = partnerEntries.map(e => `${e.person.name}(${e.status})`).join(', ');
  const totalKids = partnerEntries.reduce((sum, e) => sum + e.children.length, 0) + soloChildren.length;
  console.log(`👨‍👩‍👧 ${person.name}${partnerNames ? ' + ' + partnerNames : ''}, ${totalKids} kids`);

  return node;
}

// ─────────────────────────────────────────────────────────────────────
// Sort children by birth date, then creation order
// ─────────────────────────────────────────────────────────────────────

function sortChildren(childIds: UUID[], allPeople: Person[]): Person[] {
  return childIds
    .map(id => allPeople.find(p => p.id === id))
    .filter((p): p is Person => !!p)
    .sort((a, b) => {
      const aDate = a.birth_date && !a.birth_date_unknown ? a.birth_date : null;
      const bDate = b.birth_date && !b.birth_date_unknown ? b.birth_date : null;
      if (aDate && bDate) return aDate.localeCompare(bDate);
      if (aDate) return -1;
      if (bDate) return 1;
      return (a.creation_order || 0) - (b.creation_order || 0);
    });
}

// ─────────────────────────────────────────────────────────────────────
// Calculate subtree bounds (bottom-up)
// Bounds are relative to the node being at halfCol 0
// ─────────────────────────────────────────────────────────────────────

function calculateSubtreeBounds(node: LayoutNode): void {
  // First, recursively calculate all children's bounds
  for (const entry of node.partners) {
    for (const child of entry.children) {
      calculateSubtreeBounds(child);
    }
  }
  for (const child of node.soloChildren) {
    calculateSubtreeBounds(child);
  }

  // Start with this node's own bounds (person at 0)
  let left = -1;  // Person extends 1 to the left
  let right = 1;  // Person extends 1 to the right

  // Expand bounds for all partners
  for (const entry of node.partners) {
    const partnerLeft = entry.partnerHalfCol - 1;
    const partnerRight = entry.partnerHalfCol + 1;
    left = Math.min(left, partnerLeft);
    right = Math.max(right, partnerRight);
  }

  // Now calculate child group positions and expand bounds
  const allGroups = getChildGroups(node);

  if (allGroups.length > 0) {
    // Position child groups and resolve overlaps
    const groupPositions = calculateGroupPositions(allGroups);

    // Expand bounds based on child positions
    for (const gp of groupPositions) {
      for (let i = 0; i < gp.children.length; i++) {
        const child = gp.children[i];
        const childPos = gp.positions[i];
        left = Math.min(left, childPos + child.subtreeLeft);
        right = Math.max(right, childPos + child.subtreeRight);
      }
    }
  }

  node.subtreeLeft = left;
  node.subtreeRight = right;
}

// ─────────────────────────────────────────────────────────────────────
// Child group management
// ─────────────────────────────────────────────────────────────────────

type ChildGroup = {
  targetCenter: number;     // Pair center this group should be centered under
  children: LayoutNode[];
};

type PositionedGroup = {
  targetCenter: number;
  children: LayoutNode[];
  positions: number[];      // Positions for each child in the group
  groupLeft: number;        // Leftmost extent of this group
  groupRight: number;       // Rightmost extent of this group
};

/**
 * Get ordered child groups from a node.
 * Order: ex partners' children (leftmost ex first), solo children, current partner's children
 */
function getChildGroups(node: LayoutNode): ChildGroup[] {
  const groups: ChildGroup[] = [];

  // Ex partner groups (leftmost ex first — they're already ordered in partners array)
  const exEntries = node.partners.filter(e => e.status !== 'current');
  for (const entry of exEntries) {
    if (entry.children.length > 0) {
      groups.push({
        targetCenter: entry.pairCenter,
        children: entry.children,
      });
    }
  }

  // Solo children group (centered under person at 0)
  if (node.soloChildren.length > 0) {
    groups.push({
      targetCenter: 0,
      children: node.soloChildren,
    });
  }

  // Current partner group (rightmost)
  const currentEntry = node.partners.find(e => e.status === 'current');
  if (currentEntry && currentEntry.children.length > 0) {
    groups.push({
      targetCenter: currentEntry.pairCenter,
      children: currentEntry.children,
    });
  }

  return groups;
}

/**
 * Position children within each group centered at targetCenter,
 * then resolve overlaps between adjacent groups.
 */
function calculateGroupPositions(groups: ChildGroup[]): PositionedGroup[] {
  if (groups.length === 0) return [];

  const positioned: PositionedGroup[] = [];

  // Step 1: Position each group independently, centered at its targetCenter
  for (const group of groups) {
    const positions = positionChildrenCentered(group.children, group.targetCenter);

    let groupLeft = Infinity;
    let groupRight = -Infinity;
    for (let i = 0; i < group.children.length; i++) {
      const child = group.children[i];
      groupLeft = Math.min(groupLeft, positions[i] + child.subtreeLeft);
      groupRight = Math.max(groupRight, positions[i] + child.subtreeRight);
    }

    positioned.push({
      targetCenter: group.targetCenter,
      children: group.children,
      positions,
      groupLeft,
      groupRight,
    });
  }

  // Step 2: Resolve overlaps between adjacent groups (left to right)
  for (let i = 1; i < positioned.length; i++) {
    const prev = positioned[i - 1];
    const curr = positioned[i];

    const overlap = prev.groupRight - curr.groupLeft + MIN_GROUP_GAP;
    if (overlap > 0) {
      // Push current group (and all subsequent groups) to the right
      shiftGroup(curr, overlap);
      // Also push all subsequent groups
      for (let j = i + 1; j < positioned.length; j++) {
        // Check if this group now overlaps with the one before it
        const prevG = positioned[j - 1];
        const currG = positioned[j];
        const overlapJ = prevG.groupRight - currG.groupLeft + MIN_GROUP_GAP;
        if (overlapJ > 0) {
          shiftGroup(currG, overlapJ);
        }
      }
    }
  }

  return positioned;
}

/**
 * Shift all positions in a group by a given offset
 */
function shiftGroup(group: PositionedGroup, offset: number): void {
  for (let i = 0; i < group.positions.length; i++) {
    group.positions[i] += offset;
  }
  group.groupLeft += offset;
  group.groupRight += offset;
}

/**
 * Position children centered around a given center point.
 * Uses subtree bounds to prevent overlap between siblings.
 */
function positionChildrenCentered(children: LayoutNode[], center: number): number[] {
  const n = children.length;
  if (n === 0) return [];
  if (n === 1) return [center];

  // Calculate total width needed
  let totalWidth = 0;
  for (let i = 0; i < n; i++) {
    const child = children[i];
    const childWidth = child.subtreeRight - child.subtreeLeft;
    totalWidth += childWidth;
    if (i < n - 1) totalWidth += MIN_SUBTREE_GAP;
  }

  // Start position: center the total width around the target center
  let currentPos = center - totalWidth / 2;

  const positions: number[] = [];
  for (let i = 0; i < n; i++) {
    const child = children[i];
    positions.push(currentPos - child.subtreeLeft);
    currentPos += (child.subtreeRight - child.subtreeLeft) + MIN_SUBTREE_GAP;
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────
// Position tree (top-down assignment of halfCol and row)
// ─────────────────────────────────────────────────────────────────────

function positionTree(node: LayoutNode, halfCol: number, row: number): void {
  node.halfCol = halfCol;
  node.row = row;

  // Position all child groups
  const allGroups = getChildGroups(node);
  if (allGroups.length === 0) return;

  const groupPositions = calculateGroupPositions(allGroups);

  for (const gp of groupPositions) {
    for (let i = 0; i < gp.children.length; i++) {
      const child = gp.children[i];
      const childHalfCol = halfCol + gp.positions[i];
      positionTree(child, childHalfCol, row + 1);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Collect final positions (person + all partners)
// ─────────────────────────────────────────────────────────────────────

function collectPositions(nodes: LayoutNode[], positions: LayoutPosition[]): void {
  for (const node of nodes) {
    // Person's position
    positions.push({
      id: node.person.id,
      x: CANVAS_MARGIN + node.halfCol * HALF_CELL,
      y: CANVAS_MARGIN + node.row * ROW_HEIGHT,
    });

    // All partners' positions
    for (const entry of node.partners) {
      positions.push({
        id: entry.person.id,
        x: CANVAS_MARGIN + (node.halfCol + entry.partnerHalfCol) * HALF_CELL,
        y: CANVAS_MARGIN + node.row * ROW_HEIGHT,
      });
    }

    // Recurse into all child groups
    for (const entry of node.partners) {
      collectPositions(entry.children, positions);
    }
    collectPositions(node.soloChildren, positions);
  }
}
