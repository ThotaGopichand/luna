'use client';

import { ReactNode, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout';
import { Menu, Moon } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-foreground-muted">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Moon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-foreground">Luna</span>
                </div>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 -mr-2 text-foreground-muted hover:text-foreground"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            <main
                className={`
                    transition-all duration-300
                    p-4 lg:p-8
                    min-h-screen
                    ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}
                `}
            >
                {/* Content Container to prevent overflow */}
                <div className="max-w-7xl mx-auto w-full overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}
