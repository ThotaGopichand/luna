import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, EMERGENCY_AUTH_DOC, OWNER_EMAIL } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verify the Firebase ID token
        const auth = adminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);

        // Check if the user is the owner
        if (decodedToken.email !== OWNER_EMAIL) {
            return NextResponse.json(
                { error: 'Only the vault owner can unlock emergency access' },
                { status: 403 }
            );
        }

        // Reset the emergency lockout
        const db = adminDb();
        await db.doc(EMERGENCY_AUTH_DOC).set({
            isLocked: false,
            failedAttempts: 0,
            unlockedAt: Date.now(),
            unlockedBy: decodedToken.email,
        }, { merge: true });

        // Also add to unlock history
        await db.collection('emergency-auth').doc('unlock-history').set({
            unlocks: [{
                unlockedAt: Date.now(),
                unlockedBy: decodedToken.email,
            }]
        }, { merge: true });

        return NextResponse.json({
            success: true,
            message: 'Emergency access has been unlocked',
        });

    } catch (error: any) {
        console.error('Unlock emergency error:', error);

        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json(
                { error: 'Session expired. Please sign in again.' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
