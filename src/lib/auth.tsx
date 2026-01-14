'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserSettings } from '@/types';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    userSettings: UserSettings | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    logoutAllDevices: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
    updateUserSettings: (data: Partial<UserSettings>) => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

const DEFAULT_SETTINGS: UserSettings = {
    theme: 'dark',
    notifications: true,
    defaultStampDutyState: 'Maharashtra',
    brokerageRate: 20, // ₹20 per order (typical discount broker)
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user profile and settings from Firestore
    const fetchUserData = async (uid: string) => {
        try {
            const [profileDoc, settingsDoc] = await Promise.all([
                getDoc(doc(db, 'users', uid, 'data', 'profile')),
                getDoc(doc(db, 'users', uid, 'data', 'settings')),
            ]);

            if (profileDoc.exists()) {
                const profile = profileDoc.data() as UserProfile;

                // Check session validity against lastGlobalLogoutTime
                const tokenIssuedAt = user?.metadata?.lastSignInTime
                    ? new Date(user.metadata.lastSignInTime).getTime()
                    : 0;

                if (profile.lastGlobalLogoutTime && tokenIssuedAt < profile.lastGlobalLogoutTime) {
                    // Session is invalid, force logout
                    await signOut(auth);
                    setError('Your session has expired. Please sign in again.');
                    return;
                }

                setUserProfile(profile);
            }

            if (settingsDoc.exists()) {
                setUserSettings(settingsDoc.data() as UserSettings);
            } else {
                setUserSettings(DEFAULT_SETTINGS);
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
        }
    };

    // Create initial user profile
    const createUserProfile = async (user: User, displayName?: string) => {
        const profile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: displayName || user.displayName || '',
            photoURL: user.photoURL,
            lastGlobalLogoutTime: 0,
            createdAt: Date.now(),
        };

        await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), profile);
        await setDoc(doc(db, 'users', user.uid, 'data', 'settings'), DEFAULT_SETTINGS);

        setUserProfile(profile);
        setUserSettings(DEFAULT_SETTINGS);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                await fetchUserData(user.uid);
            } else {
                setUserProfile(null);
                setUserSettings(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string, displayName: string) => {
        try {
            setError(null);
            setLoading(true);
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(user, { displayName });
            await createUserProfile(user, displayName);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signInWithGoogle = async () => {
        try {
            setError(null);
            setLoading(true);
            const { user } = await signInWithPopup(auth, googleProvider);

            // Check if profile exists
            const profileDoc = await getDoc(doc(db, 'users', user.uid, 'data', 'profile'));
            if (!profileDoc.exists()) {
                await createUserProfile(user);
            }
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setError(null);
            await signOut(auth);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    const logoutAllDevices = async () => {
        if (!user) return;

        try {
            setError(null);
            // Update the lastGlobalLogoutTime - this invalidates all existing sessions
            const now = Date.now();
            await updateDoc(doc(db, 'users', user.uid, 'data', 'profile'), {
                lastGlobalLogoutTime: now,
            });

            // Sign out current device too
            await signOut(auth);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    const resetPassword = async (email: string) => {
        try {
            setError(null);
            await sendPasswordResetEmail(auth, email);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    const updateUserProfile = async (data: Partial<UserProfile>) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'data', 'profile'), data);
            setUserProfile((prev) => prev ? { ...prev, ...data } : null);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    const updateUserSettings = async (data: Partial<UserSettings>) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'data', 'settings'), data);
            setUserSettings((prev) => prev ? { ...prev, ...data } : null);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider
            value={{
                user,
                userProfile,
                userSettings,
                loading,
                error,
                signIn,
                signUp,
                signInWithGoogle,
                logout,
                logoutAllDevices,
                resetPassword,
                updateUserProfile,
                updateUserSettings,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Helper function to get user-friendly error messages
function getErrorMessage(code: string): string {
    switch (code) {
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return 'An error occurred. Please try again.';
    }
}
