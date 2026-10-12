import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export interface StorageUploadResult {
  downloadUrl: string;
  storagePath: string;
}

export interface StorageUploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progressPercent: number;
}

/**
 * Validates image file type and size.
 * Allowed formats: JPEG, PNG, WEBP, AVIF, SVG.
 * Max size: 10MB.
 */
export function validateImageFile(file: File, maxSizeMb = 10): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected for upload.' };
  }

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/svg+xml',
  ];

  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid file type (${file.type || 'unknown'}). Allowed: JPG, PNG, WEBP, AVIF, SVG.`,
    };
  }

  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of ${maxSizeMb} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename to avoid problematic characters in storage paths.
 */
export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Generate canonical storage paths based on business architecture:
 * - businesses/{businessId}/logo/
 * - businesses/{businessId}/products/{productId}/
 * - businesses/{businessId}/doctors/
 */
export function getBusinessLogoStoragePath(businessId: string, fileName: string): string {
  const cleanBiz = businessId ? businessId.replace(/[^a-zA-Z0-9_-]/g, '') : 'default';
  const cleanName = sanitizeFileName(fileName);
  return `businesses/${cleanBiz}/logo/${Date.now()}_${cleanName}`;
}

export function getProductImageStoragePath(businessId: string, productId: string, fileName: string): string {
  const cleanBiz = businessId ? businessId.replace(/[^a-zA-Z0-9_-]/g, '') : 'default';
  const cleanProd = productId ? productId.replace(/[^a-zA-Z0-9_-]/g, '') : 'new_product';
  const cleanName = sanitizeFileName(fileName);
  return `businesses/${cleanBiz}/products/${cleanProd}/${Date.now()}_${cleanName}`;
}

export function getDoctorImageStoragePath(businessId: string, doctorId: string, fileName: string): string {
  const cleanBiz = businessId ? businessId.replace(/[^a-zA-Z0-9_-]/g, '') : 'default';
  const cleanDoc = doctorId ? doctorId.replace(/[^a-zA-Z0-9_-]/g, '') : 'doctor';
  const cleanName = sanitizeFileName(fileName);
  return `businesses/${cleanBiz}/doctors/${cleanDoc}_${Date.now()}_${cleanName}`;
}

/**
 * Upload a file directly to Firebase Storage with progress tracking.
 */
export function uploadFileToFirebaseStorage(
  file: File,
  storagePath: string,
  onProgress?: (progress: StorageUploadProgress) => void
): Promise<StorageUploadResult> {
  return new Promise((resolve, reject) => {
    // 1. Validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return reject(new Error(validation.error));
    }

    // 2. Storage Reference
    const storageRef = ref(storage, storagePath);

    // 3. Resumable Upload Task
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || file.size;
        const transferred = snapshot.bytesTransferred;
        const progressPercent = total > 0 ? Math.min(100, Math.round((transferred / total) * 100)) : 0;

        if (onProgress) {
          onProgress({
            bytesTransferred: transferred,
            totalBytes: total,
            progressPercent,
          });
        }
      },
      (error: any) => {
        let userMessage = 'Firebase Storage upload failed.';

        switch (error.code) {
          case 'storage/unauthorized':
            userMessage =
              'Storage access denied: Please verify you are logged in and Storage Security Rules allow uploads.';
            break;
          case 'storage/quota-exceeded':
            userMessage = 'Firebase Storage quota exceeded. Please check your Firebase Blaze billing plan.';
          case 'storage/canceled':
            userMessage = 'Upload was canceled.';
            break;
          case 'storage/cannot-slice-blob':
            userMessage = 'File could not be read. Please try selecting the file again.';
            break;
          case 'storage/server-file-wrong-size':
            userMessage = 'Server received incomplete file. Please retry the upload.';
            break;
          default:
            userMessage = error.message || 'Network error during Firebase Storage upload.';
        }

        console.error(`[Firebase Storage Upload Error] Path: ${storagePath}`, error);
        reject(new Error(userMessage));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath,
          });
        } catch (urlError: any) {
          console.error('[Firebase Storage GetURL Error]', urlError);
          reject(new Error(urlError.message || 'Failed to retrieve download URL for uploaded image.'));
        }
      }
    );
  });
}

/**
 * Safely delete an asset from Firebase Storage.
 * Ignores legacy Cloudinary URLs or external URLs without errors.
 */
export async function deleteFileFromFirebaseStorage(storagePathOrUrl?: string): Promise<boolean> {
  if (!storagePathOrUrl) return false;

  // Preserve legacy Cloudinary media
  if (storagePathOrUrl.includes('cloudinary.com') || storagePathOrUrl.includes('res.cloudinary')) {
    return false;
  }

  try {
    let targetRef;

    if (storagePathOrUrl.startsWith('http://') || storagePathOrUrl.startsWith('https://')) {
      if (storagePathOrUrl.includes('firebasestorage.googleapis.com')) {
        targetRef = ref(storage, storagePathOrUrl);
      } else {
        return false;
      }
    } else {
      targetRef = ref(storage, storagePathOrUrl);
    }

    await deleteObject(targetRef);
    return true;
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      return true; // Already deleted
    }
    console.warn('[Firebase Storage Delete Warning]', storagePathOrUrl, error);
    return false;
  }
}
