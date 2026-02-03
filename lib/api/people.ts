// lib/api/people.ts
import { supabase } from "@/lib/supabase/client";

export async function listPeople(treeId: string) {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
