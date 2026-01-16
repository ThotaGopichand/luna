import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export default cloudinary;

/**
 * Generate a signed upload URL for client-side uploads
 */
export function generateUploadSignature(folder: string, publicId: string) {
    const timestamp = Math.round(new Date().getTime() / 1000);

    const params = {
        timestamp,
        folder,
        public_id: publicId,
    };

    const signature = cloudinary.utils.api_sign_request(
        params,
        process.env.CLOUDINARY_API_SECRET!
    );

    return {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
    };
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
}

/**
 * Get optimized URL for a Cloudinary asset
 */
export function getOptimizedUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    format?: string;
    quality?: string | number;
}): string {
    return cloudinary.url(publicId, {
        fetch_format: options?.format || 'auto',
        quality: options?.quality || 'auto',
        width: options?.width,
        height: options?.height,
        crop: options?.width || options?.height ? 'limit' : undefined,
        secure: true,
    });
}
