'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Lock, Chrome, ArrowRight, Eye, EyeOff, ChevronLeft, AlertTriangle, Shield, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';

type LoginMode = 'main' | 'emergency';

export default function LoginPage() {
    const [mode, setMode] = useState<LoginMode>('main');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Emergency mode status
    const [isLocked, setIsLocked] = useState(false);
    const [remainingAttempts, setRemainingAttempts] = useState(5);

    // Mobile cover state
    const [showMobileLogin, setShowMobileLogin] = useState(false);

    const { signInWithGoogle, error: authError, clearError } = useAuth();
    const router = useRouter();

    // Check emergency status on mount
    useEffect(() => {
        checkEmergencyStatus();
    }, []);

    const checkEmergencyStatus = async () => {
        try {
            const res = await fetch('/api/auth/emergency-status');
            const data = await res.json();
            setIsLocked(data.isLocked);
            setRemainingAttempts(data.remainingAttempts);
        } catch (err) {
            console.error('Failed to check emergency status:', err);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        clearError();

        try {
            await signInWithGoogle();

            // Get the ID token to verify with server
            const { auth } = await import('@/lib/firebase');
            const user = auth.currentUser;

            if (!user) {
                setError('Sign in failed. Please try again.');
                return;
            }

            const idToken = await user.getIdToken();

            // Verify with server that user is the owner
            const res = await fetch('/api/auth/verify-owner', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await res.json();

            if (!data.authorized) {
                // Sign out the non-owner user
                const { signOut } = await import('firebase/auth');
                await signOut(auth);
                setError(data.error || 'Access denied. This vault is restricted to the owner only.');
                return;
            }

            router.push('/vault');
        } catch (err: any) {
            console.error('Google sign in error:', err);
            setError(err.message || 'Sign in failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmergencyLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLocked) {
            setError('Emergency access is locked. Contact admin to unlock.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/emergency-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
                setIsLocked(data.isLocked || false);
                setRemainingAttempts(data.remainingAttempts ?? remainingAttempts);
                return;
            }

            // Store emergency token in session storage
            sessionStorage.setItem('emergencyToken', data.token);
            sessionStorage.setItem('emergencyMode', 'true');

            router.push('/emergency/vault');
        } catch (err: any) {
            console.error('Emergency login error:', err);
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const displayError = error || authError;

    return (
        <div className="min-h-screen flex bg-background relative overflow-hidden">
            {/* Cover / Left Panel */}
            <div
                onClick={() => setShowMobileLogin(true)}
                className={`
                    absolute inset-0 z-20 transition-transform duration-500 ease-in-out lg:relative lg:z-auto lg:w-1/2 xl:w-3/5 
                    bg-gradient-to-br from-primary via-primary-hover to-accent overflow-hidden cursor-pointer lg:cursor-default
                    ${showMobileLogin ? '-translate-y-full lg:translate-y-0' : 'translate-y-0'}
                `}
            >
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 h-full">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-lg flex items-center justify-center">
                            <Moon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Luna</h1>
                            <p className="text-white/70 text-sm">Secure Vault</p>
                        </div>
                    </div>

                    <div className="max-w-md space-y-6">
                        <div className="hidden lg:block">
                            <h2 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
                                Your Personal Command Center
                            </h2>
                            <p className="text-lg text-white/80 leading-relaxed">
                                Securely access your documents and trading journal with military-grade protection.
                            </p>
                        </div>

                        <div className="hidden lg:flex flex-wrap gap-3">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-sm text-white font-medium">Owner Only Access</span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-sm text-white font-medium">Emergency Mode</span>
                            </div>
                        </div>

                        <div className="lg:hidden text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Secure. Private. Yours.
                            </h2>
                            <p className="text-white/70 text-sm">
                                Your personal vault, protected and secure
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <p className="text-white/50 text-sm">
                            © 2026 Luna. Private Use Only.
                        </p>

                        <div className="lg:hidden animate-bounce text-white/80 flex flex-col items-center gap-2">
                            <span className="text-sm font-medium tracking-widest uppercase">Tap to Enter</span>
                            <ArrowRight className="w-5 h-5 rotate-90" />
                        </div>
                    </div>
                </div>

                <div className="absolute -right-40 -top-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-accent/20 rounded-full blur-2xl animate-pulse" />
            </div>

            {/* Right Panel - Auth Form */}
            <div className="w-full h-full absolute inset-0 lg:static lg:flex-1 flex items-center justify-center p-8 bg-background z-10">
                <div className="w-full max-w-md">
                    {/* Mobile back button */}
                    <button
                        onClick={() => setShowMobileLogin(false)}
                        className="lg:hidden absolute top-6 left-6 p-2 text-foreground-muted hover:text-foreground z-50"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    {/* Mode Tabs */}
                    <div className="flex mb-8 bg-background-secondary rounded-xl p-1">
                        <button
                            onClick={() => { setMode('main'); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${mode === 'main'
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            <Shield className="w-4 h-4" />
                            Main Access
                        </button>
                        <button
                            onClick={() => { setMode('emergency'); setError(null); checkEmergencyStatus(); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${mode === 'emergency'
                                    ? 'bg-warning text-black shadow-lg'
                                    : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            <ShieldAlert className="w-4 h-4" />
                            Emergency
                        </button>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-foreground">
                            {mode === 'main' ? 'Owner Access' : 'Emergency Access'}
                        </h2>
                        <p className="text-foreground-muted mt-2">
                            {mode === 'main'
                                ? 'Sign in with your Google account'
                                : 'Use emergency password when on a different device'}
                        </p>
                    </div>

                    {displayError && (
                        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{displayError}</span>
                        </div>
                    )}

                    {mode === 'main' ? (
                        /* Main Mode - Google Sign In Only */
                        <div className="space-y-6">
                            <Button
                                variant="outline"
                                className="w-full py-4 text-base"
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                loading={isLoading}
                            >
                                <Chrome className="w-5 h-5" />
                                Sign in with Google
                            </Button>

                            <p className="text-center text-foreground-subtle text-sm">
                                Only the vault owner can sign in
                            </p>
                        </div>
                    ) : (
                        /* Emergency Mode - Password Login */
                        <form onSubmit={handleEmergencyLogin} className="space-y-6">
                            {isLocked ? (
                                <div className="p-6 bg-danger/10 border border-danger/30 rounded-xl text-center">
                                    <Lock className="w-12 h-12 mx-auto mb-4 text-danger" />
                                    <h3 className="text-lg font-bold text-danger mb-2">Access Locked</h3>
                                    <p className="text-foreground-muted text-sm">
                                        Too many failed attempts. Contact admin to unlock emergency access.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <Input
                                            label="Emergency Password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter emergency password"
                                            icon={<Lock className="w-4 h-4" />}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-9 text-foreground-subtle hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    <Button
                                        type="submit"
                                        loading={isLoading}
                                        className="w-full bg-warning hover:bg-warning/90 text-black"
                                    >
                                        Emergency Access
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>

                                    <p className="text-center text-foreground-subtle text-sm">
                                        {remainingAttempts}/5 attempts remaining
                                    </p>
                                </>
                            )}
                        </form>
                    )}

                    <p className="mt-8 text-center text-foreground-subtle text-xs">
                        {mode === 'main'
                            ? 'This vault is restricted to a single owner account'
                            : 'Emergency mode provides read-only access to documents'}
                    </p>
                </div>
            </div>
        </div>
    );
}
