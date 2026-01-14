'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Moon, Mail, Lock, User, Chrome, ArrowRight, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { signIn, signUp, signInWithGoogle, error, clearError } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        clearError();

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password, displayName);
            }
            router.push('/vault');
        } catch (err) {
            // Error is handled in auth context
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        clearError();

        try {
            await signInWithGoogle();
            router.push('/vault');
        } catch (err) {
            // Error is handled in auth context
        } finally {
            setIsLoading(false);
        }
    };

    // State for mobile cover interaction
    const [showMobileLogin, setShowMobileLogin] = useState(false);

    // ... existing handlers ...

    return (
        <div className="min-h-screen flex bg-background relative overflow-hidden">
            {/* 
                Cover / Left Panel 
                - Desktop: Always visible (left half)
                - Mobile: Visible until 'tap to enter' (full screen absolute)
            */}
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

                    <div className="max-w-md">
                        {/* Clean minimal abstract visuals */}
                    </div>

                    <div className="flex justify-between items-end">
                        <p className="text-white/50 text-sm">
                            © 2024 Luna. All rights reserved.
                        </p>

                        {/* Mobile CTA */}
                        <div className="lg:hidden animate-bounce text-white/80 flex flex-col items-center gap-2">
                            <span className="text-sm font-medium tracking-widest uppercase">Tap to Enter</span>
                            <ArrowRight className="w-5 h-5 rotate-90" />
                        </div>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -right-40 -top-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-accent/20 rounded-full blur-2xl animate-pulse" />
            </div>

            {/* 
                Right Panel - Auth Form 
                - Desktop: Always visible (right half)
                - Mobile: Behind cover, revealed when cover slides up
            */}
            <div className="w-full h-full absolute inset-0 lg:static lg:flex-1 flex items-center justify-center p-8 bg-background z-10">
                <div className="w-full max-w-md">
                    {/* ... Form Content ... */}
                    {/* Mobile back button */}
                    <button
                        onClick={() => setShowMobileLogin(false)}
                        className="lg:hidden absolute top-6 left-6 p-2 text-foreground-muted hover:text-foreground z-50"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-foreground">
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p className="text-foreground-muted mt-2">
                            {isLogin
                                ? 'Sign in to access your vault and trading journal'
                                : 'Get started with your secure vault today'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <Input
                                label="Full Name"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your name"
                                icon={<User className="w-4 h-4" />}
                                required
                            />
                        )}

                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            icon={<Mail className="w-4 h-4" />}
                            required
                        />

                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
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

                        {isLogin && (
                            <div className="flex justify-end">
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-accent hover:text-accent-hover transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        )}

                        <Button
                            type="submit"
                            loading={isLoading}
                            className="w-full"
                        >
                            {isLogin ? 'Sign In' : 'Create Account'}
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-foreground-subtle text-sm">or continue with</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                    >
                        <Chrome className="w-5 h-5" />
                        Google
                    </Button>

                    <p className="mt-8 text-center text-foreground-muted text-sm">
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                clearError();
                            }}
                            className="text-accent hover:text-accent-hover font-medium transition-colors"
                        >
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
