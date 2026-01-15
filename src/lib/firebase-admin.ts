// Firebase Admin SDK initialization for server-side operations
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

function getAdminApp(): App {
    if (getApps().length === 0) {
        // For Vercel deployment, use environment variables
        const serviceAccount: ServiceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID,
        });
    } else {
        adminApp = getApps()[0];
    }
    return adminApp;
}

export const adminDb = () => getFirestore(getAdminApp());
export const adminAuth = () => getAuth(getAdminApp());

// Owner email - the only user allowed to access the vault
export const OWNER_EMAIL = process.env.OWNER_EMAIL || 't.gopichand1403@gmail.com';

// Emergency mode passwords (server-side only, never exposed to client)
export const EMERGENCY_PASSWORD = process.env.EMERGENCY_PASSWORD || 'M00nG0p!';
export const DOWNLOAD_PASSWORD = process.env.DOWNLOAD_PASSWORD || 'HeR0';

// Emergency auth collection path
export const EMERGENCY_AUTH_DOC = 'emergency-auth/status';

// Max failed attempts before lockout
export const MAX_FAILED_ATTEMPTS = 5;
