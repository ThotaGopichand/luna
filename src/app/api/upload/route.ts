import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { adminAuth } from '@/lib/firebase-admin';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_FOLDERS = ['documents', 'screenshots', 'contract-notes'];

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
        // ============ AUTHENTICATION ============
        const authenticatedUserId = await verifyAuthToken(request);
        if (!authenticatedUserId) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in again.' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;
        const folder = formData.get('folder') as string || 'documents';

        // ============ AUTHORIZATION ============

        // Verify user can only upload to their own folder
        if (userId !== authenticatedUserId) {
            return NextResponse.json(
                { error: 'Forbidden. You can only upload to your own storage.' },
                { status: 403 }
            );
        }

        // Validate folder is allowed
        if (!ALLOWED_FOLDERS.includes(folder)) {
            return NextResponse.json(
                { error: 'Invalid folder specified.' },
                { status: 400 }
            );
        }

        // ============ FILE VALIDATION ============

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: PDF, JPG, PNG' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
            );
        }

        // ============ UPLOAD TO CLOUDINARY ============

        // Generate unique public ID
        const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
        const publicId = `${uuidv4()}`;
        const cloudinaryFolder = `luna/${userId}/${folder}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary
        const result = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: cloudinaryFolder,
                    public_id: publicId,
                    resource_type: 'auto',
                    format: extension,
                    tags: [userId, folder],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        return NextResponse.json({
            url: result.secure_url,
            publicId: result.public_id,
            ref: result.public_id, // For compatibility with existing code
            fileName: file.name,
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
