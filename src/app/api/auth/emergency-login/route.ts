import { NextRequest, NextResponse } from 'next/server';
import {
    adminDb,
    EMERGENCY_PASSWORD,
    EMERGENCY_AUTH_DOC,
    MAX_FAILED_ATTEMPTS,
    OWNER_EMAIL
} from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (!password) {
            return NextResponse.json(
                { error: 'Password is required' },
                { status: 400 }
            );
        }

        const db = adminDb();
        const statusDoc = await db.doc(EMERGENCY_AUTH_DOC).get();
        const statusData = statusDoc.exists ? statusDoc.data() : null;

        // Check if locked
        if (statusData?.isLocked) {
            return NextResponse.json(
                {
                    error: 'Emergency access is locked. Contact admin to unlock.',
                    isLocked: true,
                    failedAttempts: statusData.failedAttempts || 0
                },
                { status: 403 }
            );
        }

        // Validate password
        if (password !== EMERGENCY_PASSWORD) {
            // Increment failed attempts
            const currentAttempts = (statusData?.failedAttempts || 0) + 1;
            const shouldLock = currentAttempts >= MAX_FAILED_ATTEMPTS;

            await db.doc(EMERGENCY_AUTH_DOC).set({
                isLocked: shouldLock,
                failedAttempts: currentAttempts,
                lastFailedAt: Date.now(),
                lockedAt: shouldLock ? Date.now() : null,
            }, { merge: true });

            const remainingAttempts = MAX_FAILED_ATTEMPTS - currentAttempts;

            return NextResponse.json(
                {
                    error: shouldLock
                        ? 'Emergency access is now locked due to too many failed attempts.'
                        : `Invalid password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
                    isLocked: shouldLock,
                    remainingAttempts: Math.max(0, remainingAttempts)
                },
                { status: 401 }
            );
        }

        // Password correct - reset failed attempts
        await db.doc(EMERGENCY_AUTH_DOC).set({
            isLocked: false,
            failedAttempts: 0,
            lastSuccessAt: Date.now(),
        }, { merge: true });

        // Generate a session token for emergency access
        const emergencyToken = Buffer.from(`emergency:${Date.now()}:${Math.random()}`).toString('base64');

        // Store session in Firestore (expires in 1 hour)
        await db.collection('emergency-sessions').doc(emergencyToken).set({
            createdAt: Date.now(),
            expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
            ownerEmail: OWNER_EMAIL,
        });

        return NextResponse.json({
            success: true,
            token: emergencyToken,
            expiresIn: 3600, // seconds
        });

    } catch (error) {
        console.error('Emergency login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
