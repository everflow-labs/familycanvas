"use client";

import React, { useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";

type Person = {
  id: string;
  first_name: string;
  last_name?: string | null;
  tree_id: string;
};

type Relationship = {
  id: string;
  tree_id: string;
  person_a_id: string;
  person_b_id: string;
  relationship_type: "parent_child" | "partner" | "sibling";
};

export default function FamilyCanvas({
  people,
  relationships,
}: {
  people: Person[];
  relationships: Relationship[];
}) {
  const nodes: Node[] = useMemo(() => {
    return people.map((p, idx) => ({
      id: p.id,
      type: "default",
      position: { x: (idx % 5) * 220, y: Math.floor(idx / 5) * 120 },
      data: { label: `${p.first_name}${p.last_name ? " " + p.last_name : ""}` },
    }));
  }, [people]);

  const edges: Edge[] = useMemo(() => {
    return relationships.map((r) => ({
      id: r.id,
      source: r.person_a_id,
      target: r.person_b_id,
      label: r.relationship_type,
      animated: false,
    }));
  }, [relationships]);

  return (
    <div className="h-[70vh] w-full rounded border bg-white">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
