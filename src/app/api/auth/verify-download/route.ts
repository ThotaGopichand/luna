import { NextRequest, NextResponse } from 'next/server';
import { adminDb, DOWNLOAD_PASSWORD, OWNER_EMAIL } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { password, sessionToken } = await request.json();

        if (!password || !sessionToken) {
            return NextResponse.json(
                { error: 'Password and session token are required' },
                { status: 400 }
            );
        }

        // Verify the emergency session token
        const db = adminDb();
        const sessionDoc = await db.collection('emergency-sessions').doc(sessionToken).get();

        if (!sessionDoc.exists) {
            return NextResponse.json(
                { error: 'Invalid or expired session' },
                { status: 401 }
            );
        }

        const sessionData = sessionDoc.data();
        if (sessionData?.expiresAt < Date.now()) {
            // Clean up expired session
            await db.collection('emergency-sessions').doc(sessionToken).delete();
            return NextResponse.json(
                { error: 'Session expired. Please login again.' },
                { status: 401 }
            );
        }

        // Verify the download password
        if (password !== DOWNLOAD_PASSWORD) {
            return NextResponse.json(
                { error: 'Invalid encryption password' },
                { status: 401 }
            );
        }

        // Password verified - return success
        return NextResponse.json({
            success: true,
            authorized: true,
        });

    } catch (error) {
        console.error('Verify download password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
