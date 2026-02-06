// lib/utils/photo-urls.ts
import { supabase } from '@/lib/supabase/client';
import type { Person } from '@/types/database';

/**
 * Check if a photo_url is a storage path (needs signed URL) or already a URL
 */
export function isStoragePath(photoUrl: string | null): boolean {
  if (!photoUrl) return false;
  return photoUrl.startsWith('family-photos/');
}

/**
 * Generate a signed URL for a storage path
 * Returns null if the path is invalid or signing fails
 */
export async function getSignedPhotoUrl(storagePath: string): Promise<string | null> {
  try {
    // Extract the path after 'family-photos/'
    const pathMatch = storagePath.match(/family-photos\/(.+)/);
    if (!pathMatch) return null;

    const { data, error } = await supabase.storage
      .from('family-photos')
      .createSignedUrl(pathMatch[1], 3600); // 1 hour expiry

    if (error) {
      console.error('Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return null;
  }
}

/**
 * Resolve a photo URL - if it's a storage path, get a signed URL
 * If it's already a URL (legacy), return as-is
 */
export async function resolvePhotoUrl(photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  
  // If it's a storage path, get signed URL
  if (isStoragePath(photoUrl)) {
    return getSignedPhotoUrl(photoUrl);
  }
  
  // Already a URL (legacy or external)
  return photoUrl;
}

/**
 * Resolve photo URLs for an array of people
 * Returns a Map of personId -> signedUrl
 */
export async function resolvePhotoUrls(people: Person[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  
  const peopleWithPhotos = people.filter(p => p.photo_url);
  
  // Process in parallel for speed
  await Promise.all(
    peopleWithPhotos.map(async (person) => {
      const signedUrl = await resolvePhotoUrl(person.photo_url);
      if (signedUrl) {
        urlMap.set(person.id, signedUrl);
      }
    })
  );
  
  return urlMap;
}
