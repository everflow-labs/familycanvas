// lib/api/relationships.ts
import { supabase } from "@/lib/supabase/client";
import type { Relationship, RelationshipType, ParentType } from "@/types/database";

export async function listRelationships(treeId: string) {
  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type CreateRelationshipInput = {
  tree_id: string;
  person_a_id: string;  // For parent_child: this is the PARENT
  person_b_id: string;  // For parent_child: this is the CHILD
  relationship_type: RelationshipType;
  relationship_status?: string | null;
  parent_type?: ParentType;
  is_primary_parent_set?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
};

/**
 * Create a relationship between two people.
 * 
 * IMPORTANT for parent_child relationships:
 * - person_a_id = the PARENT
 * - person_b_id = the CHILD
 * 
 * For partner and sibling relationships, the order doesn't matter semantically,
 * but we'll normalize to person_a_id < person_b_id if your database has that constraint.
 */
export async function createRelationship(input: CreateRelationshipInput): Promise<Relationship> {
  let { person_a_id, person_b_id } = input;
  
  // For symmetric relationships (partner, sibling), normalize ordering if needed
  // This handles databases with the person_a_id < person_b_id constraint
  // For parent_child, the direction matters so we DON'T swap
  if (input.relationship_type !== 'parent_child') {
    if (person_a_id > person_b_id) {
      [person_a_id, person_b_id] = [person_b_id, person_a_id];
    }
  }

  const cleanedInput = {
    tree_id: input.tree_id,
    person_a_id,
    person_b_id,
    relationship_type: input.relationship_type,
    relationship_status: input.relationship_status || null,
    parent_type: input.parent_type || null,
    is_primary_parent_set: input.is_primary_parent_set ?? false,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    notes: input.notes || null,
  };

  const { data, error } = await supabase
    .from("relationships")
    .insert([cleanedInput])
    .select("*")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to create relationship");

  return data;
}

export async function updateRelationship(
  relationshipId: string,
  updates: Partial<Omit<Relationship, "id" | "tree_id" | "person_a_id" | "person_b_id" | "created_at" | "updated_at">>
): Promise<Relationship> {
  const { data, error } = await supabase
    .from("relationships")
    .update(updates)
    .eq("id", relationshipId)
    .select("*")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to update relationship");

  return data;
}

export async function deleteRelationship(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", relationshipId);

  if (error) throw error;
}