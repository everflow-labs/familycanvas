// components/forms/PhotoUpload.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase/client';

type PhotoUploadProps = {
  currentPhotoUrl?: string | null;
  onPhotoChange: (url: string | null) => void;
  disabled?: boolean;
};

export default function PhotoUpload({
  currentPhotoUrl,
  onPhotoChange,
  disabled = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate signed URL for existing photo (private bucket)
  useEffect(() => {
    async function getSignedUrl() {
      if (!currentPhotoUrl) {
        setSignedUrl(null);
        return;
      }

      // If it's already a signed URL or data URL, use as-is
      if (currentPhotoUrl.startsWith('data:') || currentPhotoUrl.includes('token=')) {
        setSignedUrl(currentPhotoUrl);
        return;
      }

      // Extract the path from the storage URL or use as path directly
      let storagePath = currentPhotoUrl;

      // If it's a full URL, extract the path
      const match = currentPhotoUrl.match(/family-photos\/(.+)/);
      if (match) {
        storagePath = match[1];
      }

      // If it starts with photos/, use it directly (legacy flat path)
      // New paths will be photos/{userId}/{filename}
      if (!storagePath.startsWith('photos/')) {
        if (!storagePath.includes('://')) {
          storagePath = `photos/${storagePath}`;
        }
      }

      try {
        const { data, error } = await supabase.storage
          .from('family-photos')
          .createSignedUrl(storagePath, 3600); // 1 hour

        if (error) {
          console.error('Error creating signed URL:', error);
          return;
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Failed to get signed URL:', err);
      }
    }

    getSignedUrl();
  }, [currentPhotoUrl]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create preview immediately from original
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Get current user ID for scoped storage path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload photos');
      }

      // Compress image before upload
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,           // Target ~500KB
        maxWidthOrHeight: 800,     // Plenty for tree avatars
        useWebWorker: true,
        fileType: 'image/jpeg',    // Normalize to JPEG for consistency
      });

      // Generate unique filename under user-scoped path
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `photos/${user.id}/${fileName}`;

      // Upload to Supabase Storage (private bucket)
      const { error: uploadError } = await supabase.storage
        .from('family-photos')
        .upload(filePath, compressed, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Photo storage not set up. Please create a "family-photos" bucket in Supabase.');
        }
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
          throw new Error('Storage permissions not configured. Please add INSERT policy for authenticated users.');
        }
        throw uploadError;
      }

      // Store just the path (not full URL) - we'll generate signed URLs when displaying
      onPhotoChange(filePath);

      // Get signed URL for immediate display
      const { data: signedData } = await supabase.storage
        .from('family-photos')
        .createSignedUrl(filePath, 3600);

      if (signedData) {
        setSignedUrl(signedData.signedUrl);
      }

      setPreviewUrl(null);
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setError(err?.message ?? 'Failed to upload photo');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onPhotoChange]);

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    setSignedUrl(null);
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Priority: preview (just uploaded) > signed URL (from storage) > null
  const displayUrl = previewUrl || signedUrl;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {/* Preview */}
        {displayUrl ? (
          <div className="relative">
            <img
              src={displayUrl}
              alt="Photo preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                title="Remove photo"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}

        {/* Upload button */}
        {!disabled && (
          <div className="flex-1">
            <label
              className={`
                inline-flex items-center gap-2 px-3 py-1.5
                rounded-md border border-gray-300
                text-sm font-medium text-gray-700
                hover:bg-gray-50 cursor-pointer
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                disabled={uploading || disabled}
                className="hidden"
              />
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {currentPhotoUrl ? 'Change' : 'Upload Photo'}
                </>
              )}
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500">
        📷 Photos are private and auto-compressed. Max 10MB.
      </p>
    </div>
  );
}
