// lib/api/trees.ts
import { supabase } from "@/lib/supabase/client";

export async function getPrimaryTree(userId: string) {
  const { data, error } = await supabase
    .from("trees")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function createPrimaryTree(userId: string, name = "My Family") {
  // You can create more later; for now we ensure at least one primary.
  const { data, error } = await supabase
    .from("trees")
    .insert([{ user_id: userId, name, is_primary: true }])
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getOrCreatePrimaryTree(userId: string) {
  const existing = await getPrimaryTree(userId);
  if (existing) return existing;
  return await createPrimaryTree(userId);
}
