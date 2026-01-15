import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, OWNER_EMAIL } from '@/lib/firebase-admin';

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
                {
                    authorized: false,
                    error: 'Access denied. This vault is restricted to the owner only.'
                },
                { status: 403 }
            );
        }

        return NextResponse.json({
            authorized: true,
            email: decodedToken.email,
            uid: decodedToken.uid,
        });

    } catch (error: any) {
        console.error('Verify owner error:', error);

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
