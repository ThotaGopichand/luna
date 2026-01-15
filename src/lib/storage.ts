import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const UPLOAD_TIMEOUT = 120000; // 2 minutes timeout

interface UploadResult {
    url: string;
    ref: string;
    fileName: string;
}

/**
 * Upload a file to Firebase Storage with timeout and better error handling
 */
export async function uploadFile(
    userId: string,
    file: File,
    folder: 'documents' | 'screenshots' | 'contract-notes',
    onProgress?: (progress: number) => void
): Promise<UploadResult> {
    // Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
    }

    // Generate unique file name
    const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
    const uniqueFileName = `${uuidv4()}.${extension}`;
    const storagePath = `users/${userId}/${folder}/${uniqueFileName}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
        // Create upload task
        const uploadTask = uploadBytesResumable(storageRef, file, {
            contentType: file.type,
            customMetadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
            },
        });

        // Set up timeout
        const timeoutId = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error('Upload timed out. Please check your internet connection and try again.'));
        }, UPLOAD_TIMEOUT);

        // Monitor upload progress
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
                console.log(`Upload progress: ${progress.toFixed(1)}%`);
            },
            (error) => {
                clearTimeout(timeoutId);
                console.error('Upload error:', error);

                // Handle specific error codes
                switch (error.code) {
                    case 'storage/unauthorized':
                        reject(new Error('You do not have permission to upload files. Please sign in again.'));
                        break;
                    case 'storage/canceled':
                        reject(new Error('Upload was cancelled.'));
                        break;
                    case 'storage/retry-limit-exceeded':
                        reject(new Error('Upload failed after multiple retries. Please try again.'));
                        break;
                    default:
                        reject(new Error(`Upload failed: ${error.message}`));
                }
            },
            async () => {
                clearTimeout(timeoutId);
                try {
                    // Upload completed successfully, get download URL
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        url,
                        ref: storagePath,
                        fileName: file.name,
                    });
                } catch (urlError) {
                    reject(new Error('Upload succeeded but failed to get download URL.'));
                }
            }
        );
    });
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(storagePath: string): Promise<void> {
    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
    } catch (error: any) {
        // Ignore if file doesn't exist
        if (error.code !== 'storage/object-not-found') {
            throw error;
        }
    }
}

/**
 * Get a temporary download URL for a file
 * Note: Firebase Storage URLs are already long-lived tokens
 * For true temporary URLs, we use Firestore to manage access
 */
export async function getTemporaryUrl(storagePath: string): Promise<string> {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: 'File size exceeds 10MB limit',
        };
    }

    return { valid: true };
}

/**
 * Get file type icon based on extension
 */
export function getFileTypeIcon(fileName: string): 'pdf' | 'image' {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    return 'image';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
