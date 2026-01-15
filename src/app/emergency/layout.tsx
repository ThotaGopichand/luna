'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, LogOut, ShieldAlert } from 'lucide-react';

export default function EmergencyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isValid, setIsValid] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if emergency session is valid
        const token = sessionStorage.getItem('emergencyToken');
        const isEmergency = sessionStorage.getItem('emergencyMode');

        if (!token || !isEmergency) {
            router.push('/login');
            return;
        }

        setIsValid(true);
        setLoading(false);
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem('emergencyToken');
        sessionStorage.removeItem('emergencyMode');
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!isValid) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Emergency Mode Banner */}
            <div className="bg-warning text-black px-4 py-2 flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-sm font-medium">EMERGENCY MODE - Read Only Access</span>
            </div>

            {/* Header */}
            <header className="bg-background-secondary border-b border-border px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                            <Moon className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Luna Vault</h1>
                            <p className="text-xs text-foreground-muted">Emergency Access</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground-muted hover:text-danger transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Exit
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto py-6">
                {children}
            </main>
        </div>
    );
}
