// types/components.ts
import type { Person, Relationship, UUID } from "./database";

export interface CanvasProps {
  treeId: UUID;
}

export interface PersonCardProps {
  person: Person;
  onSelect?: (personId: UUID) => void;
}

export interface RelationshipEdgeProps {
  relationship: Relationship;
}
