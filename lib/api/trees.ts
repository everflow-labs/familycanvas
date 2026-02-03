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
  const { data, error } = await supabase
    .from("trees")
    .insert([{ user_id: userId, name, is_primary: true }])
    .select("*")
    .maybeSingle(); // ✅ Changed from .single() to .maybeSingle()

  if (error) throw error;
  if (!data) throw new Error("Failed to create tree");
  return data;
}

export async function getOrCreatePrimaryTree(userId: string) {
  // First, try to get existing primary tree
  const existing = await getPrimaryTree(userId);
  if (existing) return existing;

  // If no tree exists, create one
  try {
    return await createPrimaryTree(userId);
  } catch (error: any) {
    // If creation failed (e.g., race condition), try getting again
    if (error?.code === '23505') { // Unique constraint violation
      const retry = await getPrimaryTree(userId);
      if (retry) return retry;
    }
    throw error;
  }
}