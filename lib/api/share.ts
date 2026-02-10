// lib/api/share.ts
import { supabase } from '@/lib/supabase/client';

export type ShareLink = {
  id: string;
  tree_id: string;
  token: string;
  expires_at: string | null;
  created_at: string;
};

// Generate a URL-safe random token (no external dependency needed)
function generateToken(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

// Get existing share link for a tree (returns first one if multiple exist)
export async function getShareLink(treeId: string): Promise<ShareLink | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('tree_id', treeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching share link:', error);
    return null;
  }

  return data;
}

// Create a new share link for a tree
export async function createShareLink(treeId: string): Promise<ShareLink> {
  const token = generateToken();

  const { data, error } = await supabase
    .from('share_links')
    .insert({ tree_id: treeId, token })
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create share link');

  return data;
}

// Delete a share link
export async function deleteShareLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
}

// Build the full share URL from a token
export function getShareUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/share/${token}`;
}
