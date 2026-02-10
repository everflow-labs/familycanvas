// lib/api/profiles.ts
import { supabase } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  motivation: string | null;
  family_origin: string | null;
  leaf_capacity: number;
  preferred_layout: string;
  profile_completed: boolean;
  has_seen_tutorial: boolean;
  created_at: string;
  updated_at: string;
};

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export type UpdateProfileInput = {
  full_name?: string | null;
  photo_url?: string | null;
  motivation?: string | null;
  family_origin?: string | null;
  profile_completed?: boolean;
  has_seen_tutorial?: boolean;
};

export async function updateProfile(updates: UpdateProfileInput): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to update profile");

  return data;
}
