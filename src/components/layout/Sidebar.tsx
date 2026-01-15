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
    Search,
    Bell,
    X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firestore';
import { Notification } from '@/types';

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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;
        try {
            const notifs = await getNotifications(user.uid);
            setNotifications(notifs);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handleMarkRead = async (notifId: string) => {
        if (!user) return;
        await markNotificationRead(user.uid, notifId);
        setNotifications((prev) =>
            prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
        );
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        await markAllNotificationsRead(user.uid);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

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

                {/* Search & Notifications - Desktop (Collapsed) / Mobile */}
                <div className={`px-3 mb-2 flex flex-col gap-2 ${collapsed && !mobileOpen ? 'items-center' : ''}`}>
                    {(!collapsed || mobileOpen) ? (
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-foreground-muted" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full bg-background-tertiary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                            />
                        </div>
                    ) : (
                        <button className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg">
                            <Search className="w-5 h-5" />
                        </button>
                    )}

                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`
                            relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
                            text-foreground-muted hover:bg-background-tertiary hover:text-foreground
                            transition-all duration-200
                            ${(collapsed && !mobileOpen) ? 'justify-center' : ''}
                        `}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full" />
                        )}
                        {(!collapsed || mobileOpen) && (
                            <span className="text-sm font-medium">Notifications</span>
                        )}
                        {(!collapsed || mobileOpen) && unreadCount > 0 && (
                            <span className="ml-auto bg-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown/Panel */}
                    {showNotifications && (!collapsed || mobileOpen) && (
                        <div className="mb-2 bg-background-tertiary rounded-lg border border-border overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                                <span className="text-xs font-medium text-foreground-muted">Recent Alerts</span>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-xs text-accent hover:text-accent-hover">
                                        Clear all
                                    </button>
                                )}
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-foreground-muted">No notifications</div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleMarkRead(n.id)}
                                            className={`p-2 border-b border-border/50 text-xs cursor-pointer hover:bg-background-secondary ${!n.isRead ? 'bg-primary/5' : ''}`}
                                        >
                                            <p className="font-medium text-foreground truncate">{n.title}</p>
                                            <p className="text-foreground-muted truncate">{n.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
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
