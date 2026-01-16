import { v4 as uuidv4 } from 'uuid';
import { auth } from './firebase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

interface UploadResult {
    url: string;
    ref: string;
    fileName: string;
}

/**
 * Get the current user's ID token for API authentication
 */
async function getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        return await user.getIdToken();
    } catch (error) {
        console.error('Error getting ID token:', error);
        return null;
    }
}

/**
 * Upload a file to Cloudinary via API route
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

    // Get auth token
    const token = await getAuthToken();
    if (!token) {
        throw new Error('You must be logged in to upload files.');
    }

    // Show initial progress
    if (onProgress) {
        onProgress(10);
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('folder', folder);

    try {
        // Update progress to show upload starting
        if (onProgress) {
            onProgress(30);
        }

        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (onProgress) {
            onProgress(80);
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();

        if (onProgress) {
            onProgress(100);
        }

        return {
            url: result.url,
            ref: result.ref,
            fileName: result.fileName,
        };
    } catch (error: any) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Failed to upload file. Please try again.');
    }
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFile(publicId: string): Promise<void> {
    // Get auth token
    const token = await getAuthToken();
    if (!token) {
        throw new Error('You must be logged in to delete files.');
    }

    try {
        const response = await fetch('/api/delete-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ publicId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Delete failed');
        }
    } catch (error: any) {
        // Don't throw if file doesn't exist
        if (!error.message?.includes('not found')) {
            throw error;
        }
    }
}

/**
 * Get a download URL for a file
 * With Cloudinary, the URL is already accessible
 */
export async function getTemporaryUrl(fileUrl: string): Promise<string> {
    // Cloudinary URLs are already accessible, just return as-is
    return fileUrl;
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
