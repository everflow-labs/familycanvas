// types/database.ts

export type UUID = string;

/**
 * Supabase returns DATE and TIMESTAMPTZ fields as strings in JS.
 * - DATE -> "YYYY-MM-DD" (string)
 * - TIMESTAMPTZ -> ISO string
 */

export type Gender =
  | "male"
  | "female"
  | "nonbinary"
  | "unknown"
  | string; // allow other values if you store them as free text

export interface Profile {
  id: UUID; // auth.users.id
  full_name: string | null;
  leaf_capacity: number;
  preferred_layout: "timeline" | "compact" | string;
  created_at: string;
  updated_at: string;
}

export interface Tree {
  id: UUID;
  user_id: UUID; // profiles.id
  name: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: UUID;
  tree_id: UUID;

  name: string;
  native_script_name: string | null;

  birth_date: string | null; // DATE
  birth_date_unknown: boolean;

  death_date: string | null; // DATE
  death_date_unknown: boolean;
  is_deceased: boolean;

  location: string | null;
  photo_url: string | null;

  gender: Gender | null;
  is_adopted: boolean;
  is_bloodline?: boolean;

  notes: string | null;

  display_fields: Record<string, any> | null; // jsonb
  creation_order: number | null;

  created_at: string;
  updated_at: string;
}

export type RelationshipType = "partner" | "parent_child" | "sibling";
export type ParentType = "biological" | "adoptive" | null;

export interface Relationship {
  id: UUID;
  tree_id: UUID;
  person_a_id: UUID;
  person_b_id: UUID;
  relationship_type: RelationshipType;  // ✅ Match actual DB column
  relationship_status: string | null;   // ✅ Simpler name
  parent_type: ParentType;
  is_primary_parent_set: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;  // Not "relationship_notes"
  created_at: string;
  updated_at: string;
}
