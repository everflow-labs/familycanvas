// lib/layout-algorithms/generation-layout.ts
/**
 * Generational Layout Algorithm for FamilyCanvas
 * 
 * Key design principles:
 * 1. ROOT couples are centered together
 * 2. CHILD couples: the blood relative is centered below parents, spouse extends RIGHT
 * 3. Children drop from the CENTER of the partnership line
 * 4. Odd children: middle child centered, others symmetric
 * 5. Even children (2): one below each parent
 */

import type { Person, UUID } from "@/types/database";
import type { RelationshipGraph } from "@/lib/layout-algorithms/utils";
import { getVisiblePeople, getPrimaryParentSet } from "@/lib/layout-algorithms/utils";

// Layout constants
const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;
const PARTNER_GAP = 160;      // Horizontal distance between partner centers
const SIBLING_GAP = 40;       // Minimum gap between sibling subtrees
const GENERATION_HEIGHT = 180; // Vertical distance between generations
const CANVAS_MARGIN = 100;    // Margin from canvas edge

export type LayoutPosition = {
  id: UUID;
  x: number;  // Center X of the node
  y: number;  // Center Y of the node
};

/**
 * A node in our layout tree.
 */
type PersonNode = {
  person: Person;
  spouse: Person | null;
  children: PersonNode[];
  subtreeWidth: number;
};

/**
 * Main entry point for the generational layout algorithm.
 */
export function generationLayout(
  people: Person[],
  graph: RelationshipGraph,
  collapsedIds: Set<UUID> = new Set()
): LayoutPosition[] {
  const visible = getVisiblePeople(people, graph, collapsedIds);
  
  if (visible.length === 0) return [];

  // Build the tree structure
  const processed = new Set<UUID>();
  const rootNodes: PersonNode[] = [];

  // Find root people (those with no parents in the visible set)
  const roots = visible.filter(p => {
    const parentSet = getPrimaryParentSet(p.id, graph);
    if (!parentSet || parentSet.parentIds.length === 0) return true;
    const hasVisibleParent = parentSet.parentIds.some(pid => 
      visible.some(v => v.id === pid)
    );
    return !hasVisibleParent;
  });

  console.log('🌱 ROOT PEOPLE:', roots.map(r => r.name));

  // Build tree from each root
  for (const root of roots) {
    if (processed.has(root.id)) continue;
    const node = buildPersonNode(root, visible, graph, processed);
    if (node) rootNodes.push(node);
  }

  if (rootNodes.length === 0) return [];

  // Calculate subtree widths (bottom-up)
  for (const root of rootNodes) {
    calculateSubtreeWidth(root, true);
  }

  // Position all nodes (top-down)
  const positions: LayoutPosition[] = [];
  
  // Calculate total width of all root trees
  let totalWidth = 0;
  for (let i = 0; i < rootNodes.length; i++) {
    totalWidth += rootNodes[i].subtreeWidth;
    if (i > 0) totalWidth += SIBLING_GAP * 2;
  }

  // Start positioning
  let currentX = CANVAS_MARGIN + totalWidth / 2;
  
  if (rootNodes.length === 1) {
    // Single root: position at center
    positionSubtree(rootNodes[0], currentX, CANVAS_MARGIN + NODE_HEIGHT / 2, positions, true);
  } else {
    // Multiple roots: position side by side
    currentX = CANVAS_MARGIN;
    for (const root of rootNodes) {
      const centerX = currentX + root.subtreeWidth / 2;
      positionSubtree(root, centerX, CANVAS_MARGIN + NODE_HEIGHT / 2, positions, true);
      currentX += root.subtreeWidth + SIBLING_GAP * 2;
    }
  }

  console.log('📍 POSITIONS (centers):', positions);

  // Convert center positions to top-left for React Flow
  return positions.map(pos => ({
    id: pos.id,
    x: pos.x - NODE_WIDTH / 2,
    y: pos.y - NODE_HEIGHT / 2,
  }));
}

/**
 * Build a PersonNode for a person, including their spouse and children.
 */
function buildPersonNode(
  person: Person,
  allPeople: Person[],
  graph: RelationshipGraph,
  processed: Set<UUID>
): PersonNode | null {
  if (processed.has(person.id)) return null;
  processed.add(person.id);

  // Find spouse (first unprocessed partner)
  let spouse: Person | null = null;
  const partners = graph.partnersByPerson.get(person.id);
  if (partners) {
    for (const partnerId of partners) {
      if (!processed.has(partnerId)) {
        const partnerPerson = allPeople.find(p => p.id === partnerId);
        if (partnerPerson) {
          spouse = partnerPerson;
          processed.add(spouse.id);
          break;
        }
      }
    }
  }

  // Find children
  const myChildren = graph.childrenByParent.get(person.id) || new Set<UUID>();
  const spouseChildren = spouse 
    ? (graph.childrenByParent.get(spouse.id) || new Set<UUID>())
    : new Set<UUID>();

  // Get children IDs (shared between person and spouse if spouse exists)
  let childIds: UUID[];
  if (spouse) {
    childIds = [...myChildren].filter(cid => spouseChildren.has(cid));
  } else {
    childIds = [...myChildren];
  }

  // Sort children by birth date (oldest first)
  const childPeople = childIds
    .map(cid => allPeople.find(p => p.id === cid))
    .filter((p): p is Person => p !== undefined)
    .sort((a, b) => {
      if (a.birth_date && b.birth_date) {
        return a.birth_date.localeCompare(b.birth_date);
      }
      if (a.birth_date) return -1;
      if (b.birth_date) return 1;
      return (a.creation_order || 0) - (b.creation_order || 0);
    });

  // Recursively build child nodes
  const children: PersonNode[] = [];
  for (const child of childPeople) {
    const childNode = buildPersonNode(child, allPeople, graph, processed);
    if (childNode) children.push(childNode);
  }

  console.log(`👨‍👩‍👧 PERSON NODE: ${person.name}${spouse ? ' + ' + spouse.name : ''}, ${children.length} children`);

  return {
    person,
    spouse,
    children,
    subtreeWidth: 0,
  };
}

/**
 * Calculate the width needed for a person's entire subtree.
 * 
 * @param isRoot - If true, couple is centered. If false, person is centered with spouse to right.
 */
function calculateSubtreeWidth(node: PersonNode, isRoot: boolean): number {
  // First, calculate for all children (they are NOT roots)
  for (const child of node.children) {
    calculateSubtreeWidth(child, false);
  }

  // Calculate couple width
  // - Root: couple centered, width = PARTNER_GAP + NODE_WIDTH
  // - Non-root: person centered, spouse to right, width = PARTNER_GAP + NODE_WIDTH
  // Actually same formula, but the "center" point differs
  const coupleWidth = node.spouse 
    ? PARTNER_GAP + NODE_WIDTH  // person + gap + spouse (with some overlap)
    : NODE_WIDTH;

  if (node.children.length === 0) {
    node.subtreeWidth = coupleWidth;
    console.log(`  📐 Width of ${node.person.name}: ${node.subtreeWidth} (leaf, isRoot=${isRoot})`);
    return node.subtreeWidth;
  }

  // Calculate total width needed for children
  let totalChildrenWidth = 0;
  for (let i = 0; i < node.children.length; i++) {
    totalChildrenWidth += node.children[i].subtreeWidth;
    if (i > 0) totalChildrenWidth += SIBLING_GAP;
  }

  // Subtree width is the MAX of couple width and children width
  node.subtreeWidth = Math.max(coupleWidth, totalChildrenWidth);
  
  console.log(`  📐 Width of ${node.person.name}: ${node.subtreeWidth} (couple=${coupleWidth}, children=${totalChildrenWidth}, isRoot=${isRoot})`);
  
  return node.subtreeWidth;
}

/**
 * Position a subtree.
 * 
 * @param centerX - For roots: the couple center. For children: where the blood relative goes.
 * @param isRoot - Whether this is a root node (affects couple positioning)
 */
function positionSubtree(
  node: PersonNode,
  centerX: number,
  y: number,
  positions: LayoutPosition[],
  isRoot: boolean
): void {
  let personX: number;
  let spouseX: number | null = null;
  let coupleCenter: number;

  if (node.spouse) {
    if (isRoot) {
      // ROOT couple: both partners centered around centerX
      personX = centerX - PARTNER_GAP / 2;
      spouseX = centerX + PARTNER_GAP / 2;
      coupleCenter = centerX;
      console.log(`  👫 ROOT: ${node.person.name} at (${personX}, ${y}), ${node.spouse.name} at (${spouseX}, ${y}), coupleCenter=${coupleCenter}`);
    } else {
      // CHILD couple: blood relative at centerX, spouse to the RIGHT
      personX = centerX;
      spouseX = centerX + PARTNER_GAP;
      coupleCenter = centerX + PARTNER_GAP / 2;
      console.log(`  👫 CHILD: ${node.person.name} at (${personX}, ${y}), ${node.spouse.name} at (${spouseX}, ${y}), coupleCenter=${coupleCenter}`);
    }
    
    positions.push({ id: node.person.id, x: personX, y });
    positions.push({ id: node.spouse.id, x: spouseX, y });
  } else {
    // Single person
    personX = centerX;
    coupleCenter = centerX;
    positions.push({ id: node.person.id, x: personX, y });
    console.log(`  👤 ${node.person.name} at (${personX}, ${y})`);
  }

  // Position children
  if (node.children.length === 0) return;

  const childY = y + GENERATION_HEIGHT;
  const n = node.children.length;

  if (n === 1) {
    // Single child: centered below the couple center
    positionSubtree(node.children[0], coupleCenter, childY, positions, false);
    
  } else if (n === 2 && node.spouse) {
    // Two children with two parents: one below each parent
    // But we need to check if they fit without overlapping
    const child1Width = node.children[0].subtreeWidth;
    const child2Width = node.children[1].subtreeWidth;
    
    // Ideal positions: child1 below person, child2 below spouse
    let child1X = personX;
    let child2X = spouseX!;
    
    // Check if there's enough space
    const child1Right = child1X + child1Width / 2;
    const child2Left = child2X - child2Width / 2;
    const gap = child2Left - child1Right;
    
    if (gap < SIBLING_GAP) {
      // Not enough space, spread them out from couple center
      const totalWidth = child1Width + SIBLING_GAP + child2Width;
      child1X = coupleCenter - totalWidth / 2 + child1Width / 2;
      child2X = coupleCenter + totalWidth / 2 - child2Width / 2;
      console.log(`  ⚠️ Spreading children: child1X=${child1X}, child2X=${child2X}`);
    }
    
    positionSubtree(node.children[0], child1X, childY, positions, false);
    positionSubtree(node.children[1], child2X, childY, positions, false);
    
  } else if (n % 2 === 1) {
    // Odd number (3, 5, 7, ...): middle child at couple center, others symmetric
    const middleIndex = Math.floor(n / 2);
    
    // Calculate widths
    let leftWidth = 0;
    for (let i = 0; i < middleIndex; i++) {
      leftWidth += node.children[i].subtreeWidth;
      if (i > 0) leftWidth += SIBLING_GAP;
    }
    
    let rightWidth = 0;
    for (let i = middleIndex + 1; i < n; i++) {
      rightWidth += node.children[i].subtreeWidth;
      if (i > middleIndex + 1) rightWidth += SIBLING_GAP;
    }
    
    const middleWidth = node.children[middleIndex].subtreeWidth;
    
    // Position middle child at couple center
    positionSubtree(node.children[middleIndex], coupleCenter, childY, positions, false);
    
    // Position left children
    let leftX = coupleCenter - middleWidth / 2 - SIBLING_GAP;
    for (let i = middleIndex - 1; i >= 0; i--) {
      const childCenterX = leftX - node.children[i].subtreeWidth / 2;
      positionSubtree(node.children[i], childCenterX, childY, positions, false);
      leftX = childCenterX - node.children[i].subtreeWidth / 2 - SIBLING_GAP;
    }
    
    // Position right children
    let rightX = coupleCenter + middleWidth / 2 + SIBLING_GAP;
    for (let i = middleIndex + 1; i < n; i++) {
      const childCenterX = rightX + node.children[i].subtreeWidth / 2;
      positionSubtree(node.children[i], childCenterX, childY, positions, false);
      rightX = childCenterX + node.children[i].subtreeWidth / 2 + SIBLING_GAP;
    }
    
  } else {
    // Even number (4, 6, 8, ...): distribute evenly centered on couple center
    let totalWidth = 0;
    for (let i = 0; i < n; i++) {
      totalWidth += node.children[i].subtreeWidth;
      if (i > 0) totalWidth += SIBLING_GAP;
    }
    
    let x = coupleCenter - totalWidth / 2;
    for (let i = 0; i < n; i++) {
      const childCenterX = x + node.children[i].subtreeWidth / 2;
      positionSubtree(node.children[i], childCenterX, childY, positions, false);
      x += node.children[i].subtreeWidth + SIBLING_GAP;
    }
  }
}