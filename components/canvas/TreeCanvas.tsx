// components/canvas/TreeCanvas.tsx
'use client';

import { useCallback, useMemo } from 'react';
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

// Constants - should match generation-layout.ts
const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;

type TreeCanvasProps = {
  people: Person[];
  relationships: Relationship[];
  onPersonSelect?: (personId: string | null) => void;
};

const nodeTypes: NodeTypes = {
  person: PersonNode,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
};

export default function TreeCanvas({ people, relationships, onPersonSelect }: TreeCanvasProps) {
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

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (people.length === 0) {
      return { nodes: [], edges: [] };
    }

    const graph = buildRelationshipGraph(people, relationships);
    const positions = generationLayout(people, graph);

    // Create position lookup (positions are TOP-LEFT from layout algorithm)
    const positionMap = new Map(positions.map(p => [p.id, p]));

    // Step 1: Convert to React Flow nodes
    const nodes: Node[] = positions.map((pos) => {
      const person = people.find((p) => p.id === pos.id)!;
      return {
        id: person.id,
        type: 'person',
        position: { x: pos.x, y: pos.y },
        data: {
          person,
          onClick: handlePersonClick,
        },
        draggable: false,
      };
    });

    // Step 2: Create edges with proper connector positions
    const edges: Edge[] = [];

    // Helper to get node center from top-left position
    const getNodeCenter = (pos: { x: number; y: number }) => ({
      x: pos.x + NODE_WIDTH / 2,
      y: pos.y + NODE_HEIGHT / 2,
    });

    // Helper to get node edges
    const getNodeEdges = (pos: { x: number; y: number }) => ({
      left: pos.x,
      right: pos.x + NODE_WIDTH,
      top: pos.y,
      bottom: pos.y + NODE_HEIGHT,
      centerX: pos.x + NODE_WIDTH / 2,
      centerY: pos.y + NODE_HEIGHT / 2,
    });

    // Track partner pairs to avoid duplicates
    const partnerPairs = new Set<string>();
    
    // Track partnership midpoints for parent-child connectors
    const partnershipMidpoints = new Map<string, { x: number; y: number }>();

    // Add partnership edges (horizontal lines between partners)
    for (const rel of relationships) {
      if (rel.relationship_type === 'partner') {
        const pairKey = [rel.person_a_id, rel.person_b_id].sort().join('-');
        if (partnerPairs.has(pairKey)) continue;
        partnerPairs.add(pairKey);
        
        const pos1 = positionMap.get(rel.person_a_id);
        const pos2 = positionMap.get(rel.person_b_id);
        
        if (pos1 && pos2) {
          const edges1 = getNodeEdges(pos1);
          const edges2 = getNodeEdges(pos2);
          
          // Determine which is left and which is right
          const leftEdges = edges1.centerX < edges2.centerX ? edges1 : edges2;
          const rightEdges = edges1.centerX < edges2.centerX ? edges2 : edges1;
          
          // Partnership line: from right edge of left person to left edge of right person
          // At the vertical center of the nodes
          const lineY = leftEdges.centerY;
          const x1 = leftEdges.right;  // Right edge of left person
          const x2 = rightEdges.left;  // Left edge of right person
          
          // Calculate midpoint for child connectors
          const midX = (x1 + x2) / 2;
          
          // Store midpoint for both people
          partnershipMidpoints.set(rel.person_a_id, { x: midX, y: lineY });
          partnershipMidpoints.set(rel.person_b_id, { x: midX, y: lineY });
          
          edges.push({
            id: `partner-${rel.id}`,
            source: rel.person_a_id,
            target: rel.person_b_id,
            type: 'relationship',
            data: { 
              relationship: rel,
              partnerPos: { 
                x1, 
                x2, 
                y: lineY 
              }
            },
            animated: false,
          });
        }
      }
    }

    // Build parent-child relationships
    // Map: childId -> [parentId1, parentId2, ...]
    const childToParents = new Map<string, string[]>();
    const childToRel = new Map<string, Relationship>();
    
    for (const rel of relationships) {
      if (rel.relationship_type === 'parent_child') {
        const parents = childToParents.get(rel.person_b_id) || [];
        parents.push(rel.person_a_id);
        childToParents.set(rel.person_b_id, parents);
        if (!childToRel.has(rel.person_b_id)) {
          childToRel.set(rel.person_b_id, rel);
        }
      }
    }

    // Add parent-child edges with T-connectors
    for (const [childId, parentIds] of childToParents.entries()) {
      const childPos = positionMap.get(childId);
      const rel = childToRel.get(childId);
      
      if (!childPos || !rel) continue;

      const childEdges = getNodeEdges(childPos);

      if (parentIds.length >= 2) {
        // Two parents: T-connector from partnership midpoint
        // Check if we have a stored partnership midpoint
        const midpoint = partnershipMidpoints.get(parentIds[0]) || 
                        partnershipMidpoints.get(parentIds[1]);

        if (midpoint) {
          edges.push({
            id: `pc-${childId}`,
            source: parentIds[0],
            target: childId,
            type: 'relationship',
            data: { 
              relationship: rel,
              parentChildConnector: {
                parentsMidX: midpoint.x,
                parentsY: midpoint.y,
                childX: childEdges.centerX,
                childY: childEdges.top,
              }
            },
            animated: false,
          });
        } else {
          // Fallback: calculate midpoint from parent positions
          const p1Pos = positionMap.get(parentIds[0]);
          const p2Pos = positionMap.get(parentIds[1]);

          if (p1Pos && p2Pos) {
            const p1Edges = getNodeEdges(p1Pos);
            const p2Edges = getNodeEdges(p2Pos);
            const parentsMidX = (p1Edges.centerX + p2Edges.centerX) / 2;
            
            edges.push({
              id: `pc-${childId}`,
              source: parentIds[0],
              target: childId,
              type: 'relationship',
              data: { 
                relationship: rel,
                parentChildConnector: {
                  parentsMidX,
                  parentsY: p1Edges.bottom,
                  childX: childEdges.centerX,
                  childY: childEdges.top,
                }
              },
              animated: false,
            });
          }
        }
      } else if (parentIds.length === 1) {
        // Single parent
        const parentPos = positionMap.get(parentIds[0]);
        
        if (parentPos) {
          const parentEdges = getNodeEdges(parentPos);
          
          // Check if this parent has a partner (use partnership midpoint)
          const midpoint = partnershipMidpoints.get(parentIds[0]);
          
          if (midpoint) {
            // Parent has partner: drop from partnership line
            edges.push({
              id: `pc-${childId}`,
              source: parentIds[0],
              target: childId,
              type: 'relationship',
              data: { 
                relationship: rel,
                parentChildConnector: {
                  parentsMidX: midpoint.x,
                  parentsY: midpoint.y,
                  childX: childEdges.centerX,
                  childY: childEdges.top,
                }
              },
              animated: false,
            });
          } else {
            // Single parent with no partner: drop from parent's bottom center
            edges.push({
              id: `pc-${childId}`,
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
                }
              },
              animated: false,
            });
          }
        }
      }
    }

    return { nodes, edges };
  }, [people, relationships, handlePersonClick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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
