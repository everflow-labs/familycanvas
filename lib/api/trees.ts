// lib/api/trees.ts
import { supabase } from "@/lib/supabase/client";

export type TreeRow = {
  id: string;
  user_id: string;
  name: string;
  is_primary: boolean;
  created_at: string;
};

/** Get or create the user's primary tree (existing logic) */
export async function getOrCreatePrimaryTree(userId: string): Promise<TreeRow> {
  // Try to find existing primary tree
  const { data: existing, error: fetchError } = await supabase
    .from("trees")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .single();

  if (existing) return existing;

  // Create a new primary tree
  const { data: newTree, error: createError } = await supabase
    .from("trees")
    .insert({ user_id: userId, name: "Family 1", is_primary: true })
    .select("*")
    .single();

  if (createError) throw createError;
  if (!newTree) throw new Error("Failed to create tree");

  return newTree;
}

/** List all trees for the current user */
export async function listTrees(): Promise<TreeRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("trees")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Create a new tree */
export async function createTree(name: string): Promise<TreeRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("trees")
    .insert({ user_id: user.id, name, is_primary: false })
    .select("*")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to create tree");
  return data;
}

/** Rename a tree */
export async function renameTree(treeId: string, newName: string): Promise<TreeRow> {
  const { data, error } = await supabase
    .from("trees")
    .update({ name: newName })
    .eq("id", treeId)
    .select("*")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to rename tree");
  return data;
}

/** Delete a tree (cascade deletes people + relationships via DB) */
export async function deleteTree(treeId: string): Promise<void> {
  const { error } = await supabase
    .from("trees")
    .delete()
    .eq("id", treeId);

  if (error) throw error;
}

/** Get the people count for a specific tree */
export async function getTreePeopleCount(treeId: string): Promise<number> {
  const { count, error } = await supabase
    .from("people")
    .select("*", { count: "exact", head: true })
    .eq("tree_id", treeId);

  if (error) throw error;
  return count ?? 0;
}
