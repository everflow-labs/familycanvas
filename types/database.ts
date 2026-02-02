// types/database.ts

export type UUID = string;

export type Gender = "male" | "female" | "nonbinary" | "unknown";

export interface Person {
  id: UUID;
  tree_id: UUID;

  first_name: string;
  last_name?: string | null;

  // Optional metadata
  gender?: Gender | null;
  birth_date?: string | null; // ISO string (YYYY-MM-DD)
  death_date?: string | null; // ISO string (YYYY-MM-DD)
  notes?: string | null;

  created_at?: string; // ISO datetime
  updated_at?: string; // ISO datetime
}

export type RelationshipType =
  | "parent_child"
  | "spouse"
  | "partner"
  | "sibling"
  | "other";

export interface Relationship {
  id: UUID;
  tree_id: UUID;

  from_person_id: UUID;
  to_person_id: UUID;

  type: RelationshipType;

  // Optional fields for ordering / metadata
  created_at?: string;
  updated_at?: string;
}

export interface Tree {
  id: UUID;
  owner_user_id: UUID;

  name: string;
  description?: string | null;

  created_at?: string;
  updated_at?: string;
}
