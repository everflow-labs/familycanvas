// lib/api/relationships.ts
import { supabase } from "@/lib/supabase/client";

export async function listRelationships(treeId: string) {
  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
