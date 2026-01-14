'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, X, Check, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firestore';
import { Notification, NotificationType } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    const getNotificationIcon = (type: NotificationType) => {
        switch (type) {
            case 'expiry_critical':
                return <AlertTriangle className="w-4 h-4 text-danger" />;
            case 'expiry_warning':
                return <AlertTriangle className="w-4 h-4 text-warning" />;
            default:
                return <Info className="w-4 h-4 text-accent" />;
        }
    };

    return (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="flex items-center justify-between h-16 px-6">
                {/* Title */}
                <div>
                    <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                    {subtitle && (
                        <p className="text-sm text-foreground-muted">{subtitle}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        {showSearch ? (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-64 px-4 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        setShowSearch(false);
                                        setSearchQuery('');
                                    }}
                                    className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowSearch(true)}
                                className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs font-medium rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 top-12 w-80 bg-background-secondary border border-border rounded-xl shadow-xl animate-fade-in">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                    <h3 className="font-medium text-foreground">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-xs text-accent hover:text-accent-hover"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center text-foreground-muted text-sm">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.slice(0, 10).map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`
                          flex items-start gap-3 px-4 py-3 hover:bg-background-tertiary transition-colors cursor-pointer
                          ${!notif.isRead ? 'bg-primary/5' : ''}
                        `}
                                                onClick={() => handleMarkRead(notif.id)}
                                            >
                                                <div className="mt-0.5">
                                                    {getNotificationIcon(notif.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-xs text-foreground-muted line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-xs text-foreground-subtle mt-1">
                                                        {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                                                    </p>
                                                </div>
                                                {!notif.isRead && (
                                                    <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Page actions */}
                    {actions}
                </div>
            </div>

            {/* Click outside handler */}
            {showNotifications && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowNotifications(false)}
                />
            )}
        </header>
    );
}
