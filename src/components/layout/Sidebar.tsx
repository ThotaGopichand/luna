'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FolderOpen,
    BookOpen,
    BarChart3,
    Settings,
    LogOut,
    Shield,
    Moon,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const navItems = [
    {
        name: 'Vault',
        href: '/vault',
        icon: FolderOpen,
        description: 'Secure Document Storage',
    },
    {
        name: 'Journal',
        href: '/journal',
        icon: BookOpen,
        description: 'Trading Ledger',
    },
    {
        name: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        description: 'Performance Insights',
    },
    {
        name: 'Playbook',
        href: '/playbook',
        icon: Shield,
        description: 'Strategy Rules',
    },
    {
        name: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'Preferences',
    },
];

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed top-0 bottom-0 left-0 z-40
                    bg-background-secondary border-r border-border
                    transition-all duration-300 ease-in-out
                    ${collapsed ? 'lg:w-20' : 'lg:w-64'}
                    ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                    <Link href="/vault" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <Moon className="w-5 h-5 text-white" />
                        </div>
                        {(!collapsed || mobileOpen) && (
                            <div>
                                <h1 className="text-lg font-bold text-foreground">Luna</h1>
                                <p className="text-xs text-foreground-subtle">Secure Vault</p>
                            </div>
                        )}
                    </Link>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-2 text-foreground-muted hover:text-foreground"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                                    transition-all duration-200 group
                                    ${isActive
                                        ? 'bg-primary/10 text-primary-light border border-primary/20'
                                        : 'text-foreground-muted hover:bg-background-tertiary hover:text-foreground'
                                    }
                                `}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-light' : ''}`} />
                                {(!collapsed || mobileOpen) && (
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                        <p className="text-xs text-foreground-subtle truncate opacity-70">
                                            {item.description}
                                        </p>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-border">
                    {(!collapsed || mobileOpen) && user && (
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                    {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {user.displayName || 'User'}
                                </p>
                                <p className="text-xs text-foreground-subtle truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => logout()}
                        className={`
                            flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
                            text-foreground-muted hover:bg-danger/10 hover:text-danger
                            transition-all duration-200
                            ${(collapsed && !mobileOpen) ? 'justify-center' : ''}
                        `}
                    >
                        <LogOut className="w-5 h-5" />
                        {(!collapsed || mobileOpen) && <span className="text-sm">Sign Out</span>}
                    </button>
                </div>

                {/* Collapse toggle (Desktop only) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="
                        hidden lg:flex
                        absolute -right-3 top-20 w-6 h-6
                        bg-background-secondary border border-border rounded-full
                        items-center justify-center
                        text-foreground-muted hover:text-foreground
                        transition-colors shadow-md z-50
                    "
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>
            </aside>
        </>
    );
}
