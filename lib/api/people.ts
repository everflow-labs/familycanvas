// lib/api/people.ts
import { supabase } from "@/lib/supabase/client";
import type { Person } from "@/types/database";

export async function listPeople(treeId: string) {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type CreatePersonInput = {
  tree_id: string;
  name: string;
  native_script_name?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  birth_date_unknown?: boolean;
  death_date?: string | null;
  death_date_unknown?: boolean;
  is_deceased?: boolean;
  location?: string | null;
  photo_url?: string | null;
  is_adopted?: boolean;
  is_bloodline?: boolean;
  notes?: string | null;
};

export async function createPerson(input: CreatePersonInput): Promise<Person> {
  // Clean up empty strings to null
  const cleanedInput = {
    ...input,
    native_script_name: input.native_script_name || null,
    gender: input.gender || null,
    birth_date: input.birth_date || null,
    location: input.location || null,
    photo_url: input.photo_url || null,
    notes: input.notes || null,
  };

  const { data, error } = await supabase
    .from("people")
    .insert([cleanedInput])
    .select("*")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to create person");
  
  return data;
}

export async function updatePerson(
  personId: string,
  updates: Partial<Omit<Person, "id" | "tree_id" | "created_at" | "updated_at">>
): Promise<Person> {
  const { data, error } = await supabase
    .from("people")
    .update(updates)
    .eq("id", personId)
    .select("*")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to update person");

  return data;
}

export async function deletePerson(personId: string): Promise<void> {
  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", personId);

  if (error) throw error;
}
