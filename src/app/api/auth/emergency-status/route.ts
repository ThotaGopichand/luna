import { NextRequest, NextResponse } from 'next/server';
import { adminDb, EMERGENCY_AUTH_DOC, MAX_FAILED_ATTEMPTS } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const db = adminDb();
        const statusDoc = await db.doc(EMERGENCY_AUTH_DOC).get();
        const statusData = statusDoc.exists ? statusDoc.data() : null;

        return NextResponse.json({
            isLocked: statusData?.isLocked || false,
            failedAttempts: statusData?.failedAttempts || 0,
            remainingAttempts: MAX_FAILED_ATTEMPTS - (statusData?.failedAttempts || 0),
            lockedAt: statusData?.lockedAt || null,
        });

    } catch (error) {
        console.error('Emergency status error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
