import { supabase } from './client';

const BUCKET_NAME = 'message-attachments';

// ============================================
// FILE UPLOAD
// ============================================

export async function uploadFile(
  file: File,
  path: string,
): Promise<{ path: string }> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  return {
    path: data.path,
  };
}

// ============================================
// FILE DOWNLOAD
// ============================================

export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function generateFilePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  // Strip any directory components first to prevent path traversal
  const basename = fileName.split('/').pop()?.split('\\').pop() ?? 'file';
  const sanitizedFileName = basename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${timestamp}-${sanitizedFileName}`;
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function isValidFileType(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  const allowedExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp', // Images
    'pdf', // PDFs
    'doc',
    'docx', // Word documents
    'txt', // Text files
  ];
  return allowedExtensions.includes(extension);
}

export function getFileSizeMB(fileSizeBytes: number): number {
  return fileSizeBytes / (1024 * 1024);
}

export const MAX_FILE_SIZE_MB = 10;

// ============================================
// PROFILE PICTURES
// ============================================

const PROFILE_PICTURES_BUCKET = 'profile-pictures';

export const MAX_PROFILE_IMAGE_SIZE_MB = 10;
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

function getProfilePublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadProfileImage(
  path: string,
  file: File,
): Promise<string> {
  const { error } = await supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  return getProfilePublicUrl(path) + '?t=' + Date.now();
}

export async function deleteProfileImage(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .remove([path]);
  if (error) throw error;
}
