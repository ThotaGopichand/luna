import { NextRequest, NextResponse } from 'next/server';
import { adminDb, OWNER_EMAIL } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    try {
        // Get the authorization header (emergency token)
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];

        // Verify the emergency session token
        const db = adminDb();
        const sessionDoc = await db.collection('emergency-sessions').doc(token).get();

        if (!sessionDoc.exists) {
            return NextResponse.json(
                { error: 'Invalid or expired session' },
                { status: 401 }
            );
        }

        const sessionData = sessionDoc.data();
        if (sessionData?.expiresAt < Date.now()) {
            // Clean up expired session
            await db.collection('emergency-sessions').doc(token).delete();
            return NextResponse.json(
                { error: 'Session expired. Please login again.' },
                { status: 401 }
            );
        }

        // Get owner's UID from their profile
        const usersSnapshot = await db.collection('users').get();
        let ownerUid: string | null = null;

        for (const userDoc of usersSnapshot.docs) {
            const profileDoc = await db.doc(`users/${userDoc.id}/data/profile`).get();
            if (profileDoc.exists && profileDoc.data()?.email === OWNER_EMAIL) {
                ownerUid = userDoc.id;
                break;
            }
        }

        if (!ownerUid) {
            return NextResponse.json(
                { error: 'Owner data not found' },
                { status: 404 }
            );
        }

        // Fetch owner's documents
        const documentsSnapshot = await db
            .collection('users')
            .doc(ownerUid)
            .collection('documents')
            .orderBy('uploadedAt', 'desc')
            .get();

        const documents = documentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            documents,
            count: documents.length,
        });

    } catch (error) {
        console.error('Emergency documents error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
