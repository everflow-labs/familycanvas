// components/canvas/TreeCanvas.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import PersonNode from './PersonNode';
import RelationshipEdge from './RelationshipEdge';

import type { Person, Relationship } from '@/types/database';
import { buildRelationshipGraph } from '@/lib/layout-algorithms/utils';
import { generationLayout } from '@/lib/layout-algorithms/generation-layout';

// Node dimensions (must match PersonNode styling)
const NODE_WIDTH = 120;
const NODE_HEIGHT = 100;
const TOGGLE_SIZE = 20;

export type QuickAddHandlers = {
  onAddChild: (personId: string) => void;
  onAddPartner: (personId: string) => void;
  onAddSibling: (personId: string) => void;
  onAddParent: (personId: string) => void;
};

type TreeCanvasProps = {
  people: Person[];
  relationships: Relationship[];
  onPersonSelect?: (personId: string | null) => void;
  quickAddHandlers?: QuickAddHandlers;
  collapsedIds?: Set<string>;
  onToggleCollapse?: (pairKey: string) => void;
  readOnly?: boolean;
  focusPersonId?: string | null;
  selectedPersonId?: string | null;
};

// Collapse toggle node - small circle at T-connector junction
type CollapseToggleData = {
  isCollapsed: boolean;
  onToggle: () => void;
};

function CollapseToggleNodeComponent({ data }: { data: CollapseToggleData }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        data.onToggle();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      style={{
        // Invisible touch area — 40x40 centered around the 20px visible circle
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        pointerEvents: 'all',
        margin: '-10px', // offset to keep visual position the same
      }}
      title={data.isCollapsed ? 'Expand branch' : 'Collapse branch'}
    >
      <div
        style={{
          width: TOGGLE_SIZE,
          height: TOGGLE_SIZE,
          borderRadius: '50%',
          backgroundColor: 'white',
          border: '2px solid #9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          lineHeight: 1,
          color: '#6b7280',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6';
          (e.currentTarget as HTMLDivElement).style.color = '#3b82f6';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#9ca3af';
          (e.currentTarget as HTMLDivElement).style.color = '#6b7280';
        }}
      >
        {data.isCollapsed ? '▶' : '▼'}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  person: PersonNode,
  collapseToggle: CollapseToggleNodeComponent,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
};

// Stable empty set to avoid infinite re-render when collapsedIds prop is omitted
const EMPTY_SET = new Set<string>();

// Internal component to handle focusing/panning to a specific node
// Must be inside ReactFlow to use useReactFlow hook
function FocusHandler({ personId, nodes }: { personId?: string | null; nodes: Node[] }) {
  const { setCenter } = useReactFlow();

  useEffect(() => {
    if (!personId) return;

    const node = nodes.find((n) => n.id === personId);
    if (!node) return;

    // Center viewport on the node (with a small delay to let layout settle)
    const timer = setTimeout(() => {
      setCenter(
        node.position.x + 60, // center of node (NODE_WIDTH/2)
        node.position.y + 50, // center of node (NODE_HEIGHT/2)
        { zoom: 1, duration: 400 }
      );
    }, 50);

    return () => clearTimeout(timer);
  }, [personId, nodes, setCenter]);

  return null;
}

// Adjusts viewport after collapse/expand actions
function CollapseViewHandler({
  actionRef,
  nodes,
}: {
  actionRef: React.RefObject<{ pairKey: string; action: 'collapse' | 'expand' } | null>;
  nodes: Node[];
}) {
  const { setCenter, fitView } = useReactFlow();

  useEffect(() => {
    const action = actionRef.current;
    if (!action) return;
    actionRef.current = null;

    // Parse parent IDs from pairKey (format: "id1_id2" or "id1_solo")
    const parentIds = action.pairKey.replace('_solo', '').split('_');

    const timer = setTimeout(() => {
      if (action.action === 'collapse') {
        // Center on the parent couple
        const parentNodes = nodes.filter((n) => parentIds.includes(n.id));
        if (parentNodes.length > 0) {
          const avgX =
            parentNodes.reduce((sum, n) => sum + n.position.x + NODE_WIDTH / 2, 0) /
            parentNodes.length;
          const avgY =
            parentNodes.reduce((sum, n) => sum + n.position.y + NODE_HEIGHT / 2, 0) /
            parentNodes.length;
          setCenter(avgX, avgY, { zoom: 1, duration: 400 });
        }
      } else {
        // Expand: zoom out to show the full expanded branch
        fitView({ duration: 400, padding: 0.15 });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [nodes, actionRef, setCenter, fitView]);

  return null;
}

function TreeCanvasInner({
  people,
  relationships,
  onPersonSelect,
  quickAddHandlers,
  collapsedIds = EMPTY_SET,
  onToggleCollapse,
  readOnly = false,
  focusPersonId,
  selectedPersonId,
}: TreeCanvasProps) {
  // Track the last collapse/expand action for viewport adjustment
  const lastCollapseActionRef = useRef<{ pairKey: string; action: 'collapse' | 'expand' } | null>(null);

  const handlePersonClick = useCallback(
    (personId: string) => {
      if (onPersonSelect) onPersonSelect(personId);

      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: node.id === personId,
        }))
      );
    },
    [onPersonSelect]
  );

  // Compute quick add availability for each person
  const getQuickAddInfo = useCallback(
    (personId: string) => {
      const person = people.find(p => p.id === personId);
      const isBloodline = person?.is_bloodline !== false;

      // Check if has a current partner (status='current' in DB)
      const hasCurrentPartner = relationships.some(
        (r) =>
          r.relationship_type === 'partner' &&
          r.relationship_status === 'current' &&
          (r.person_a_id === personId || r.person_b_id === personId)
      );

      // Count parents
      const parentCount = relationships.filter(
        (r) => r.relationship_type === 'parent_child' && r.person_b_id === personId
      ).length;

      // Check if has at least one parent (for sibling)
      const hasParent = parentCount > 0;
      const isRoot = parentCount === 0;

      // ── canAddParent logic ──────────────────────────────────────────
      // Only allowed at topmost generation (parentCount === 0) + bloodline (or direction not yet chosen)
      // Adding a 2nd parent (parentCount === 1) is handled via link candidates in the details panel
      let canAddParent = false;
      if (isRoot && parentCount === 0) {
        if (isBloodline) {
          canAddParent = true;
        } else {
          // Non-bloodline root: allow only if direction not yet committed
          const partnerIds = relationships
            .filter(
              (r) =>
                r.relationship_type === 'partner' &&
                (r.person_a_id === personId || r.person_b_id === personId)
            )
            .map((r) => (r.person_a_id === personId ? r.person_b_id : r.person_a_id));

          const allPartnersAreRoots = partnerIds.every((pid) => {
            const partnerParentCount = relationships.filter(
              (r) => r.relationship_type === 'parent_child' && r.person_b_id === pid
            ).length;
            return partnerParentCount === 0;
          });

          canAddParent = allPartnersAreRoots;
        }
      }

      // ── canAddPartner logic ─────────────────────────────────────────
      // Non-bloodline members who lost their current partner cannot re-partner
      const canAddPartner =
        !hasCurrentPartner && !person?.is_deceased && isBloodline;

      return {
        canAddChild: true,
        canAddPartner,
        canAddSibling: hasParent,
        canAddParent,
      };
    },
    [people, relationships]
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (people.length === 0) {
      return { nodes: [], edges: [] };
    }

    const graph = buildRelationshipGraph(people, relationships);
    const positions = generationLayout(people, graph, collapsedIds, relationships);

    // Create position lookup (positions are top-left corner of nodes)
    const positionMap = new Map(positions.map((p) => [p.id, p]));

    // Helper to get node edges
    const getNodeEdges = (pos: { x: number; y: number }) => ({
      top: pos.y,
      bottom: pos.y + NODE_HEIGHT,
      left: pos.x,
      right: pos.x + NODE_WIDTH,
      centerX: pos.x + NODE_WIDTH / 2,
      centerY: pos.y + NODE_HEIGHT / 2,
    });

    // Step 1: Convert to React Flow nodes
    const personNodes: Node[] = positions.map((pos) => {
      const person = people.find((p) => p.id === pos.id)!;
      const quickAddInfo = getQuickAddInfo(person.id);

      return {
        id: person.id,
        type: 'person',
        position: { x: pos.x, y: pos.y },
        data: {
          person,
          onClick: readOnly ? undefined : handlePersonClick,
          quickAdd: (!readOnly && quickAddHandlers)
            ? {
                ...quickAddInfo,
                onAddChild: () => quickAddHandlers.onAddChild(person.id),
                onAddPartner: () => quickAddHandlers.onAddPartner(person.id),
                onAddSibling: () => quickAddHandlers.onAddSibling(person.id),
                onAddParent: () => quickAddHandlers.onAddParent(person.id),
              }
            : undefined,
        },
        draggable: false,
      };
    });

    // Step 2: Create edges with proper connector positions
    const edges: Edge[] = [];

    // Add partnership edges (horizontal lines between partners)
    const partnerPairs = new Set<string>();
    for (const rel of relationships) {
      if (rel.relationship_type === 'partner') {
        const pairKey = [rel.person_a_id, rel.person_b_id].sort().join('-');
        if (!partnerPairs.has(pairKey)) {
          partnerPairs.add(pairKey);

          const pos1 = positionMap.get(rel.person_a_id);
          const pos2 = positionMap.get(rel.person_b_id);

          if (pos1 && pos2) {
            const edges1 = getNodeEdges(pos1);
            const edges2 = getNodeEdges(pos2);

            const leftEdges = pos1.x < pos2.x ? edges1 : edges2;
            const rightEdges = pos1.x < pos2.x ? edges2 : edges1;

            const y = leftEdges.centerY;

            edges.push({
              id: `partner-${rel.id}`,
              source: rel.person_a_id,
              target: rel.person_b_id,
              type: 'relationship',
              data: {
                relationship: rel,
                partnerPos: {
                  x1: leftEdges.right,
                  x2: rightEdges.left,
                  y,
                },
              },
              animated: false,
            });
          }
        }
      }
    }

    // Add parent-child edges: group siblings by parent pair for shared rail connectors
    // Step A: Collect children → parents mapping
    const childToParents = new Map<string, string[]>();
    const childToRel = new Map<string, Relationship>();

    for (const rel of relationships) {
      if (rel.relationship_type === 'parent_child') {
        const parents = childToParents.get(rel.person_b_id) || [];
        parents.push(rel.person_a_id);
        childToParents.set(rel.person_b_id, parents);
        childToRel.set(rel.person_b_id, rel);
      }
    }

    // Step B: Group children by their parent pair key
    // Key = sorted parent IDs (or single parent ID for solo-parent children)
    const pairToChildren = new Map<string, { childId: string; rel: Relationship }[]>();

    for (const [childId, parentIds] of childToParents.entries()) {
      const key = parentIds.length === 2
        ? [...parentIds].sort().join('|')
        : parentIds[0];
      if (!pairToChildren.has(key)) pairToChildren.set(key, []);
      pairToChildren.get(key)!.push({ childId, rel: childToRel.get(childId)! });
    }

    // Step C: Build a row→sorted centerX lookup for adjusting parentsMidX
    // when other partner nodes sit between the two parents of a pair.
    const rowNodeCenters = new Map<number, number[]>();
    for (const pos of positions) {
      const edges = getNodeEdges(pos);
      const row = pos.y;
      if (!rowNodeCenters.has(row)) rowNodeCenters.set(row, []);
      rowNodeCenters.get(row)!.push(edges.centerX);
    }
    for (const arr of rowNodeCenters.values()) arr.sort((a, b) => a - b);

    // Track stagger index per shared parent so L-shaped single-child connectors
    // from the same multi-partner person don't overlap. Keyed by the person ID
    // that appears in multiple parent pairs (the multi-partner person).
    const staggerCountByPerson = new Map<string, number>();

    // Pre-compute which person IDs appear in multiple parent pairs
    const pairCountByPerson = new Map<string, number>();
    for (const pairKey of pairToChildren.keys()) {
      for (const pid of pairKey.split('|')) {
        pairCountByPerson.set(pid, (pairCountByPerson.get(pid) || 0) + 1);
      }
    }

    // Step D: Create edges per parent pair
    for (const [pairKey, children] of pairToChildren.entries()) {
      const parentIds = pairKey.split('|');
      const isTwoParents = parentIds.length === 2;

      // Calculate the shared anchor point (pair center or solo parent bottom)
      let parentsMidX: number;
      let parentsY: number;

      if (isTwoParents) {
        const p1Pos = positionMap.get(parentIds[0]);
        const p2Pos = positionMap.get(parentIds[1]);
        if (!p1Pos || !p2Pos) continue;
        const p1Edges = getNodeEdges(p1Pos);
        const p2Edges = getNodeEdges(p2Pos);
        parentsY = p1Edges.centerY;

        // Default midpoint between the two parents
        const rawMidX = (p1Edges.centerX + p2Edges.centerX) / 2;

        // Check if any other node sits between the two parents in the same row.
        // If so, use the midpoint between the farther parent and the nearest
        // intervening node toward the other parent (keeps stem in a clear gap).
        const leftX = Math.min(p1Edges.centerX, p2Edges.centerX);
        const rightX = Math.max(p1Edges.centerX, p2Edges.centerX);
        const rowCenters = rowNodeCenters.get(p1Pos.y) || [];
        const intervening = rowCenters.filter(cx => cx > leftX + 1 && cx < rightX - 1);

        if (intervening.length > 0) {
          // For left-side partner: nearest intervening node toward right parent
          // For right-side partner: nearest intervening node toward left parent
          const leftParentX = Math.min(p1Edges.centerX, p2Edges.centerX);
          const nearestFromLeft = Math.min(...intervening); // closest node to the left parent
          parentsMidX = (leftParentX + nearestFromLeft) / 2;
        } else {
          parentsMidX = rawMidX;
        }
      } else {
        const parentPos = positionMap.get(parentIds[0]);
        if (!parentPos) continue;
        const parentEdges = getNodeEdges(parentPos);
        parentsMidX = parentEdges.centerX;
        parentsY = parentEdges.bottom;
      }

      // Get all children's positions
      const validChildren: { childId: string; rel: Relationship; childX: number; childY: number }[] = [];
      for (const { childId, rel } of children) {
        const childPos = positionMap.get(childId);
        if (!childPos) continue;
        const childEdges = getNodeEdges(childPos);
        validChildren.push({ childId, rel, childX: childEdges.centerX, childY: childEdges.top });
      }

      if (validChildren.length === 0) continue;

      // Use first child's rel as the "representative" edge relationship
      const firstRel = validChildren[0].rel;

      // Compute stagger index for L-shaped / offset connectors from multi-partner people
      let staggerIndex = 0;
      if (isTwoParents) {
        const sharedParent = parentIds.find(pid => (pairCountByPerson.get(pid) || 0) > 1);
        if (sharedParent) {
          staggerIndex = staggerCountByPerson.get(sharedParent) || 0;
          staggerCountByPerson.set(sharedParent, staggerIndex + 1);
        }
      }

      if (validChildren.length === 1) {
        // Single child: simple T-connector (no rail needed)
        const isLShaped = Math.abs(parentsMidX - validChildren[0].childX) >= 2;

        edges.push({
          id: `pc-${firstRel.id}`,
          source: parentIds[0],
          target: validChildren[0].childId,
          type: 'relationship',
          data: {
            relationship: firstRel,
            parentChildConnector: {
              parentsMidX,
              parentsY,
              childX: validChildren[0].childX,
              childY: validChildren[0].childY,
              staggerIndex,
            },
          },
          animated: false,
        });
      } else {
        // Multiple children: group rail connector
        edges.push({
          id: `pc-group-${pairKey}`,
          source: parentIds[0],
          target: validChildren[0].childId,
          type: 'relationship',
          data: {
            relationship: firstRel,
            groupChildConnector: {
              parentsMidX,
              parentsY,
              children: validChildren.map(c => ({ childX: c.childX, childY: c.childY })),
              staggerIndex,
            },
          },
          animated: false,
        });
      }
    }

    // Step 3: Create collapse toggle nodes (skip in readOnly mode)
    const collapseNodes: Node[] = [];

    if (!readOnly) {
    const handledPairs = new Set<string>();

    // Helper: make a sorted pair key for dedup
    const makeSortedPairKey = (a: string, b?: string) => {
      if (!b) return `${a}_solo`;
      return [a, b].sort().join('_');
    };

    // Iterate over all people to find parent-partner pairs with children
    for (const person of people) {
      const personPos = positionMap.get(person.id);
      if (!personPos) continue;

      const childIds = graph.childrenByParent.get(person.id);
      if (!childIds || childIds.size === 0) continue;

      const partnerIds = graph.partnersByPerson.get(person.id);

      if (partnerIds) {
        for (const partnerId of partnerIds) {
          const pairKey = makeSortedPairKey(person.id, partnerId);
          if (handledPairs.has(pairKey)) continue;

          // Check if this pair actually shares children (use full graph, not just visible)
          const partnerChildIds = graph.childrenByParent.get(partnerId) || new Set<string>();
          let hasSharedChildren = false;
          for (const cid of childIds) {
            if (partnerChildIds.has(cid)) {
              hasSharedChildren = true;
              break;
            }
          }
          if (!hasSharedChildren) continue;

          handledPairs.add(pairKey);

          const partnerPos = positionMap.get(partnerId);
          if (!partnerPos) continue;

          const pEdges = getNodeEdges(personPos);
          const partnerNodeEdges = getNodeEdges(partnerPos);

          // Use adjusted midpoint that avoids intervening partner nodes (same logic as edge stems)
          const leftX = Math.min(pEdges.centerX, partnerNodeEdges.centerX);
          const rightX = Math.max(pEdges.centerX, partnerNodeEdges.centerX);
          const rowCenters = rowNodeCenters.get(personPos.y) || [];
          const intervening = rowCenters.filter(cx => cx > leftX + 1 && cx < rightX - 1);

          let jx: number;
          if (intervening.length > 0) {
            const nearestFromLeft = Math.min(...intervening);
            jx = (leftX + nearestFromLeft) / 2;
          } else {
            jx = (pEdges.centerX + partnerNodeEdges.centerX) / 2;
          }
          const jy = pEdges.centerY;

          const isCollapsed = collapsedIds.has(pairKey);

          collapseNodes.push({
            id: `collapse-${pairKey}`,
            type: 'collapseToggle',
            position: {
              x: jx - TOGGLE_SIZE / 2,
              y: jy - TOGGLE_SIZE / 2,
            },
            data: {
              isCollapsed,
              onToggle: () => {
                lastCollapseActionRef.current = {
                  pairKey,
                  action: isCollapsed ? 'expand' : 'collapse',
                };
                if (onToggleCollapse) onToggleCollapse(pairKey);
              },
            },
            draggable: false,
            selectable: false,
            zIndex: 10,
          });
        }
      }

      // Solo children: children of this person with no other parent
      const soloChildIds: string[] = [];
      for (const cid of childIds) {
        const childParentLinks = graph.parentsByChild.get(cid) || [];
        if (childParentLinks.length <= 1) {
          soloChildIds.push(cid);
        }
      }

      if (soloChildIds.length > 0) {
        const soloPairKey = makeSortedPairKey(person.id);
        if (!handledPairs.has(soloPairKey)) {
          handledPairs.add(soloPairKey);

          const pEdges = getNodeEdges(personPos);
          const jx = pEdges.centerX;
          const jy = pEdges.bottom + 5;

          const isCollapsed = collapsedIds.has(soloPairKey);

          collapseNodes.push({
            id: `collapse-${soloPairKey}`,
            type: 'collapseToggle',
            position: {
              x: jx - TOGGLE_SIZE / 2,
              y: jy - TOGGLE_SIZE / 2,
            },
            data: {
              isCollapsed,
              onToggle: () => {
                lastCollapseActionRef.current = {
                  pairKey: soloPairKey,
                  action: isCollapsed ? 'expand' : 'collapse',
                };
                if (onToggleCollapse) onToggleCollapse(soloPairKey);
              },
            },
            draggable: false,
            selectable: false,
            zIndex: 10,
          });
        }
      }
    }

    } // end if (!readOnly)

    return { nodes: [...personNodes, ...collapseNodes], edges };
  }, [people, relationships, handlePersonClick, getQuickAddInfo, quickAddHandlers, collapsedIds, onToggleCollapse, readOnly]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync React Flow state when layout recomputes (e.g. collapse/expand, data changes)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Sync node selection when selectedPersonId changes externally (e.g. search, panel navigation)
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: selectedPersonId ? node.id === selectedPersonId : false,
      }))
    );
  }, [selectedPersonId, setNodes]);

  const handlePaneClick = useCallback(() => {
    if (readOnly) return;
    if (onPersonSelect) onPersonSelect(null);
    setNodes((nds) => nds.map((node) => ({ ...node, selected: false })));
  }, [onPersonSelect, setNodes, readOnly]);

  return (
    <div className="w-full h-full" style={{ touchAction: 'none' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        connectOnClick={false}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable={!readOnly}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        preventScrolling={true}
      >
        <Background color="#f0f0f0" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const person = (node.data as any)?.person as Person | undefined;
            if (!person) return '#e5e7eb';
            if (person.is_deceased) return '#9ca3af';
            if (person.gender === 'male') return '#93c5fd';
            if (person.gender === 'female') return '#fbcfe8';
            return '#e5e7eb';
          }}
          maskColor="rgb(240, 240, 240, 0.6)"
        />
        <FocusHandler personId={focusPersonId} nodes={nodes} />
        <CollapseViewHandler actionRef={lastCollapseActionRef} nodes={nodes} />
      </ReactFlow>
    </div>
  );
}

// Wrap in ReactFlowProvider so useReactFlow works inside FocusHandler
export default function TreeCanvas(props: TreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
