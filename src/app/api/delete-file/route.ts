import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Verify the user's Firebase session
 */
async function verifySession(request: NextRequest): Promise<string | null> {
    try {
        // Try to get session from cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('firebase-session')?.value;

        if (sessionCookie) {
            const decodedClaims = await adminAuth().verifySessionCookie(sessionCookie, true);
            return decodedClaims.uid;
        }

        // Fallback: Try Authorization header (for client-side calls)
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await adminAuth().verifyIdToken(token);
            return decodedToken.uid;
        }

        return null;
    } catch (error) {
        console.error('Session verification error:', error);
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

        // ============ SECURITY CHECKS ============

        // 1. Verify user is authenticated
        const authenticatedUserId = await verifySession(request);
        if (!authenticatedUserId) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in again.' },
                { status: 401 }
            );
        }

        // 2. Verify the file belongs to the authenticated user
        // Cloudinary public IDs follow the format: luna/{userId}/{folder}/{uuid}
        const publicIdParts = publicId.split('/');
        if (publicIdParts.length >= 2) {
            // Format: luna/userId/folder/uuid
            const fileUserId = publicIdParts[1];
            if (fileUserId !== authenticatedUserId) {
                return NextResponse.json(
                    { error: 'Forbidden. You can only delete your own files.' },
                    { status: 403 }
                );
            }
        }

        // ============ DELETE FROM CLOUDINARY ============

        // Delete from Cloudinary
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
