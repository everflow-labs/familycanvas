// components/canvas/RelationshipEdge.tsx
'use client';

import { memo } from 'react';
import { BaseEdge, EdgeProps } from 'reactflow';
import type { Relationship } from '@/types/database';

// Must match the constants in generation-layout.ts and TreeCanvas.tsx
const NODE_HEIGHT = 80;

// ═══════════════════════════════════════════════════════════════════════════
// EMERALD THEME — healthy connections are green, former are warm brown/gold
// ═══════════════════════════════════════════════════════════════════════════
const EDGE_COLORS = {
  // Current partner — deep emerald, thick
  partner: '#047857',
  // Former partner — warm brown (dead leaf)
  partnerDivorced: '#96703a',
  partnerSeparated: '#96703a',
  // Deceased partner — muted gold
  partnerDeceased: '#8a6d40',
  // Parent-child — medium teal, thinner
  parentChild: '#2d9272',
  // Collapse button
  collapseBorder: '#2d9272',
  collapseBg: '#ecfdf5',
  collapseText: '#047857',
};

const PARTNER_STROKE_WIDTH = 3;
const PARTNER_FORMER_STROKE_WIDTH = 2.5;
const CHILD_STROKE_WIDTH = 1.5;

export type RelationshipEdgeData = {
  relationship: Relationship;
  partnerPos?: {
    x1: number;
    x2: number;
    y: number;
  };
  parentChildConnector?: {
    parentsMidX: number;
    parentsY: number;
    childX: number;
    childY: number;
    staggerIndex?: number;
  };
  groupChildConnector?: {
    parentsMidX: number;
    parentsY: number;
    children: { childX: number; childY: number }[];
    staggerIndex?: number;
  };
  collapseToggle?: {
    isCollapsed: boolean;
    collapsePersonId: string;
    onToggleCollapse: (personId: string) => void;
  };
};

function RelationshipEdge({
  id,
  data,
}: EdgeProps<RelationshipEdgeData>) {
  const { relationship, partnerPos, parentChildConnector, groupChildConnector, collapseToggle } = data || {};

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
    const path = `M ${x1},${y} L ${x2},${y}`;

    const status = relationship.relationship_status;
    const isDivorced = status === 'divorced';
    const isSeparated = status === 'separated';
    const isDeceased = status === 'deceased';
    const isFormer = isDivorced || isSeparated || isDeceased;

    // Pick color based on status
    let strokeColor = EDGE_COLORS.partner;
    if (isDivorced) strokeColor = EDGE_COLORS.partnerDivorced;
    else if (isSeparated) strokeColor = EDGE_COLORS.partnerSeparated;
    else if (isDeceased) strokeColor = EDGE_COLORS.partnerDeceased;

    // Dash pattern: divorced/separated = longer dashes, deceased = shorter
    let dashArray: string | undefined;
    if (isDivorced || isSeparated) dashArray = '8,4';
    else if (isDeceased) dashArray = '4,4';

    // Collapse button position: midpoint of partner line
    const midX = (x1 + x2) / 2;
    const btnSize = 20;

    return (
      <>
        <BaseEdge
          id={id}
          path={path}
          style={{
            stroke: strokeColor,
            strokeWidth: isFormer ? PARTNER_FORMER_STROKE_WIDTH : PARTNER_STROKE_WIDTH,
            strokeDasharray: dashArray,
            opacity: isFormer ? 0.7 : 1,
          }}
        />
        {collapseToggle && (
          <foreignObject
            x={midX - btnSize / 2}
            y={y - btnSize / 2}
            width={btnSize}
            height={btnSize}
            style={{ overflow: 'visible' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                collapseToggle.onToggleCollapse(collapseToggle.collapsePersonId);
              }}
              style={{
                width: btnSize,
                height: btnSize,
                borderRadius: '50%',
                border: `2px solid ${EDGE_COLORS.collapseBorder}`,
                backgroundColor: collapseToggle.isCollapsed ? EDGE_COLORS.collapseBg : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                color: EDGE_COLORS.collapseText,
                padding: 0,
                lineHeight: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 150ms ease',
              }}
              title={collapseToggle.isCollapsed ? 'Expand branch' : 'Collapse branch'}
            >
              {collapseToggle.isCollapsed ? '▶' : '▼'}
            </button>
          </foreignObject>
        )}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARENT-CHILD: Group rail connector (multiple siblings from same pair)
  // ═══════════════════════════════════════════════════════════════════════════
  if (type === 'parent_child' && groupChildConnector) {
    const { parentsMidX, parentsY, children, staggerIndex = 0 } = groupChildConnector;
    const parentsBottom = parentsY + NODE_HEIGHT / 2;
    const topChildY = Math.min(...children.map(c => c.childY));
    const baseRailY = (parentsBottom + topChildY) / 2;
    // Stagger rail upward for multi-partner people so rails don't overlap
    const STAGGER_PX = 12;
    const maxOffset = (topChildY - parentsBottom) * 0.4;
    const staggerOffset = Math.min(staggerIndex * STAGGER_PX, maxOffset);
    const railY = baseRailY - staggerOffset;

    const leftX = Math.min(parentsMidX, ...children.map(c => c.childX));
    const rightX = Math.max(parentsMidX, ...children.map(c => c.childX));

    // Build path: vertical drop from pair center → horizontal rail → individual drops
    let path = `M ${parentsMidX},${parentsY} L ${parentsMidX},${railY}`;
    // Horizontal rail
    path += ` M ${leftX},${railY} L ${rightX},${railY}`;
    // Individual drops from rail to each child
    for (const child of children) {
      path += ` M ${child.childX},${railY} L ${child.childX},${child.childY}`;
    }

    return (
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: EDGE_COLORS.parentChild,
          strokeWidth: CHILD_STROKE_WIDTH,
          fill: 'none',
        }}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARENT-CHILD: Single T-connector from partnership center down to child
  // ═══════════════════════════════════════════════════════════════════════════
  if (type === 'parent_child') {
    if (!parentChildConnector) {
      console.warn('Parent-child missing connector data:', id);
      return null;
    }

    const { parentsMidX, parentsY, childX, childY, staggerIndex = 0 } = parentChildConnector;
    const parentsBottom = parentsY + NODE_HEIGHT / 2;
    const baseDropY = (parentsBottom + childY) / 2;
    // Stagger L-shaped connectors upward (toward parents) so they don't overlap
    // with each other or with group rail connectors below
    const STAGGER_PX = 12;
    const maxOffset = (childY - parentsBottom) * 0.4; // never use more than 40% of the gap
    const staggerOffset = Math.min(staggerIndex * STAGGER_PX, maxOffset);
    const dropY = baseDropY - staggerOffset;

    let path: string;

    if (Math.abs(parentsMidX - childX) < 2) {
      path = `M ${parentsMidX},${parentsY} L ${childX},${childY}`;
    } else {
      path = `
        M ${parentsMidX},${parentsY}
        L ${parentsMidX},${dropY}
        L ${childX},${dropY}
        L ${childX},${childY}
      `.replace(/\s+/g, ' ').trim();
    }

    return (
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: EDGE_COLORS.parentChild,
          strokeWidth: CHILD_STROKE_WIDTH,
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
