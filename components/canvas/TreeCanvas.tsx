// components/canvas/TreeCanvas.tsx
'use client';

import { useCallback, useEffect, useMemo } from 'react';
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
      style={{
        width: TOGGLE_SIZE,
        height: TOGGLE_SIZE,
        borderRadius: '50%',
        backgroundColor: 'white',
        border: '2px solid #9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '8px',
        lineHeight: 1,
        color: '#6b7280',
        pointerEvents: 'all',
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6';
        (e.currentTarget as HTMLDivElement).style.color = '#3b82f6';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#9ca3af';
        (e.currentTarget as HTMLDivElement).style.color = '#6b7280';
      }}
      title={data.isCollapsed ? 'Expand branch' : 'Collapse branch'}
    >
      {data.isCollapsed ? '▶' : '▼'}
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

export default function TreeCanvas({
  people,
  relationships,
  onPersonSelect,
  quickAddHandlers,
  collapsedIds = new Set(),
  onToggleCollapse,
}: TreeCanvasProps) {
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
          onClick: handlePersonClick,
          quickAdd: quickAddHandlers
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

    // Add parent-child edges with T-connectors
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

    for (const [childId, parentIds] of childToParents.entries()) {
      const childPos = positionMap.get(childId);
      const rel = childToRel.get(childId);

      if (!childPos || !rel) continue;

      const childEdges = getNodeEdges(childPos);

      if (parentIds.length === 2) {
        const p1Pos = positionMap.get(parentIds[0]);
        const p2Pos = positionMap.get(parentIds[1]);

        if (p1Pos && p2Pos) {
          const p1Edges = getNodeEdges(p1Pos);
          const p2Edges = getNodeEdges(p2Pos);

          const parentsMidX = (p1Edges.centerX + p2Edges.centerX) / 2;
          const partnerLineY = p1Edges.centerY;

          edges.push({
            id: `pc-${rel.id}`,
            source: parentIds[0],
            target: childId,
            type: 'relationship',
            data: {
              relationship: rel,
              parentChildConnector: {
                parentsMidX,
                parentsY: partnerLineY,
                childX: childEdges.centerX,
                childY: childEdges.top,
              },
            },
            animated: false,
          });
        }
      } else if (parentIds.length === 1) {
        const parentPos = positionMap.get(parentIds[0]);

        if (parentPos) {
          const parentEdges = getNodeEdges(parentPos);

          edges.push({
            id: `pc-${rel.id}`,
            source: parentIds[0],
            target: childId,
            type: 'relationship',
            data: {
              relationship: rel,
              parentChildConnector: {
                parentsMidX: parentEdges.centerX,
                parentsY: parentEdges.bottom,
                childX: childEdges.centerX,
                childY: childEdges.top,
              },
            },
            animated: false,
          });
        }
      }
    }

    // Step 3: Create collapse toggle nodes — one per parent-partner pair that has children
    const collapseNodes: Node[] = [];
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

          const jx = (pEdges.centerX + partnerNodeEdges.centerX) / 2;
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

    return { nodes: [...personNodes, ...collapseNodes], edges };
  }, [people, relationships, handlePersonClick, getQuickAddInfo, quickAddHandlers, collapsedIds, onToggleCollapse]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync React Flow state when layout recomputes (e.g. collapse/expand, data changes)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handlePaneClick = useCallback(() => {
    if (onPersonSelect) onPersonSelect(null);
    setNodes((nds) => nds.map((node) => ({ ...node, selected: false })));
  }, [onPersonSelect, setNodes]);

  return (
    <div className="w-full h-full">
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
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
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
      </ReactFlow>
    </div>
  );
}
