// components/canvas/RelationshipEdge.tsx
'use client';

import { memo } from 'react';
import { BaseEdge, EdgeProps } from 'reactflow';
import type { Relationship } from '@/types/database';

// Must match the constants in generation-layout.ts and TreeCanvas.tsx
const NODE_HEIGHT = 80;

export type RelationshipEdgeData = {
  relationship: Relationship;
  // For partner relationships: horizontal line coordinates
  partnerPos?: { 
    x1: number;  // Right edge of left person
    x2: number;  // Left edge of right person
    y: number;   // Y coordinate (vertical center of nodes)
  };
  // For parent-child relationships: T-connector coordinates
  parentChildConnector?: {
    parentsMidX: number;  // X of partnership line center (or single parent center)
    parentsY: number;     // Y of partnership line (vertical center of parent nodes)
    childX: number;       // X center of child node
    childY: number;       // Y top of child node
  };
};

function RelationshipEdge({
  id,
  data,
}: EdgeProps<RelationshipEdgeData>) {
  const { relationship, partnerPos, parentChildConnector } = data || {};

  if (!relationship) {
    console.warn('No relationship data for edge:', id);
    return null;
  }

  const type = relationship.relationship_type;

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTNERSHIP: Horizontal line between partners
  // ═══════════════════════════════════════════════════════════════════════════
  if (type === 'partner') {
    if (!partnerPos) {
      console.warn('Partnership missing partnerPos:', id);
      return null;
    }

    const { x1, x2, y } = partnerPos;
    
    // Simple horizontal line from right edge of left person to left edge of right person
    const path = `M ${x1},${y} L ${x2},${y}`;
    
    const status = relationship.relationship_status;
    const isDivorced = status === 'divorced';
    const isDeceased = status === 'deceased_partner';
    
    return (
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: isDivorced || isDeceased ? '#9ca3af' : '#3b82f6',
          strokeWidth: 2,
          strokeDasharray: isDivorced ? '8,4' : isDeceased ? '4,4' : undefined,
        }}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARENT-CHILD: T-connector from partnership center down to child
  // ═══════════════════════════════════════════════════════════════════════════
  if (type === 'parent_child') {
    if (!parentChildConnector) {
      console.warn('Parent-child missing connector data:', id);
      return null;
    }

    const { parentsMidX, parentsY, childX, childY } = parentChildConnector;
    
    // Calculate parent node bottom (parentsY is the vertical center)
    const parentsBottom = parentsY + NODE_HEIGHT / 2;
    
    // Elbow should be halfway between parent bottom and child top
    const dropY = (parentsBottom + childY) / 2;
    
    // Path: 
    // 1. Start from partnership line center (at vertical center of parents)
    // 2. Drop vertically to the elbow
    // 3. Move horizontally to above the child
    // 4. Drop vertically to child's top
    let path: string;
    
    if (Math.abs(parentsMidX - childX) < 2) {
      // Child is directly below parents - simple vertical line
      path = `M ${parentsMidX},${parentsY} L ${childX},${childY}`;
    } else {
      // Child is offset - need T-shape
      path = `
        M ${parentsMidX},${parentsY}
        L ${parentsMidX},${dropY}
        L ${childX},${dropY}
        L ${childX},${childY}
      `.replace(/\s+/g, ' ').trim();
    }
    
    const isAdoptive = relationship.parent_type === 'adoptive';
    
    return (
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: '#6b7280',
          strokeWidth: 2,
          strokeDasharray: isAdoptive ? '5,3' : undefined,
          fill: 'none',
        }}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIBLING: Not rendered (connected via parents)
  // ═══════════════════════════════════════════════════════════════════════════
  if (type === 'sibling') {
    return null;
  }

  console.warn('Unknown relationship type:', type, id);
  return null;
}

export default memo(RelationshipEdge);
