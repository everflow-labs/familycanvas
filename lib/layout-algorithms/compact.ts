// lib/layout-algorithms/compact.ts
import type { Person, UUID } from "@/types/database";
import type { RelationshipGraph } from "./utils";
import { getVisiblePeople, getPrimaryParentSet, sortPeopleStable } from "./utils";
import {
  LEAF_WIDTH,
  CANVAS_MARGIN_X,
  CANVAS_MARGIN_Y,
  COMPACT_ROW_HEIGHT,
  COMPACT_BRANCH_INDENT,
  COMPACT_PARTNER_GAP,
} from "./constants";

export type LayoutPosition = {
  id: UUID;
  x: number;
  y: number;
};

/**
 * Phase 4.5: Compact Layout
 * Tree-style layout with generation-based rows
 */
export function compactLayout(
  people: Person[],
  graph: RelationshipGraph,
  collapsedIds: Set<UUID> = new Set()
): LayoutPosition[] {
  const visible = getVisiblePeople(people, graph, collapsedIds);
  const positions: LayoutPosition[] = [];
  const processed = new Set<UUID>();

  // Find root people (no parents)
  const roots = visible.filter(p => {
    const parents = getPrimaryParentSet(p.id, graph);
    return !parents || parents.parentIds.length === 0;
  });

  let currentY = CANVAS_MARGIN_Y;
  let currentX = CANVAS_MARGIN_X;

  // Process each root and its descendants
  for (const root of sortPeopleStable(roots)) {
    if (processed.has(root.id)) continue;
    
    const { positions: subtreePos, width } = layoutSubtree(
      root.id,
      currentX,
      currentY,
      0, // generation level
      graph,
      processed,
      visible
    );
    
    positions.push(...subtreePos);
    currentX += width + COMPACT_BRANCH_INDENT;
  }

  return positions;
}

function layoutSubtree(
  personId: UUID,
  x: number,
  y: number,
  generation: number,
  graph: RelationshipGraph,
  processed: Set<UUID>,
  visible: Person[]
): { positions: LayoutPosition[]; width: number } {
  if (processed.has(personId)) {
    return { positions: [], width: 0 };
  }
  
  processed.add(personId);
  const positions: LayoutPosition[] = [{ id: personId, x, y }];
  
  let maxWidth = LEAF_WIDTH;
  let childX = x;
  
  // Position partners next to this person
  const partners = graph.partnersByPerson.get(personId);
  if (partners) {
    for (const partnerId of partners) {
      if (!processed.has(partnerId) && visible.some(p => p.id === partnerId)) {
        childX += COMPACT_PARTNER_GAP;
        positions.push({ id: partnerId, x: childX, y });
        processed.add(partnerId);
        maxWidth = Math.max(maxWidth, childX - x + LEAF_WIDTH);
      }
    }
  }

  // Position children below
  const children = graph.childrenByParent.get(personId);
  if (children && children.size > 0) {
    const childY = y + COMPACT_ROW_HEIGHT;
    let nextChildX = x;
    
    for (const childId of children) {
      if (processed.has(childId) || !visible.some(p => p.id === childId)) continue;
      
      const subtree = layoutSubtree(
        childId,
        nextChildX,
        childY,
        generation + 1,
        graph,
        processed,
        visible
      );
      
      positions.push(...subtree.positions);
      nextChildX += subtree.width + COMPACT_BRANCH_INDENT / 2;
      maxWidth = Math.max(maxWidth, nextChildX - x);
    }
  }

  return { positions, width: maxWidth };
}