import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Verify the user's Firebase ID token from Authorization header
 */
async function verifyAuthToken(request: NextRequest): Promise<string | null> {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.substring(7);
        const decodedToken = await adminAuth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { publicId } = await request.json();

        if (!publicId) {
            return NextResponse.json(
                { error: 'Public ID is required' },
                { status: 400 }
            );
        }

        // ============ AUTHENTICATION ============
        const authenticatedUserId = await verifyAuthToken(request);
        if (!authenticatedUserId) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in again.' },
                { status: 401 }
            );
        }

        // ============ AUTHORIZATION ============
        // Verify the file belongs to the authenticated user
        // Cloudinary public IDs follow the format: luna/{userId}/{folder}/{uuid}
        const publicIdParts = publicId.split('/');
        if (publicIdParts.length >= 2) {
            const fileUserId = publicIdParts[1];
            if (fileUserId !== authenticatedUserId) {
                return NextResponse.json(
                    { error: 'Forbidden. You can only delete your own files.' },
                    { status: 403 }
                );
            }
        }

        // ============ DELETE FROM CLOUDINARY ============
        await cloudinary.uploader.destroy(publicId);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: error.message || 'Delete failed' },
            { status: 500 }
        );
    }
}
