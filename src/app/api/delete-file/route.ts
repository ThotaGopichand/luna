import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
    try {
        const { publicId } = await request.json();

        if (!publicId) {
            return NextResponse.json(
                { error: 'Public ID is required' },
                { status: 400 }
            );
        }

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
