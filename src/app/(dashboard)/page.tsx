'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Upload, TrendingUp, BarChart3, FileText, Clock,
    ArrowRight, Wallet, Calendar, Target, Zap
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getDocuments } from '@/lib/firestore';
import { getTrades } from '@/lib/firestore';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalDocuments: 0,
        totalTrades: 0,
        loading: true
    });

    useEffect(() => {
        if (user) {
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        if (!user) return;
        try {
            const [docs, trades] = await Promise.all([
                getDocuments(user.uid),
                getTrades(user.uid)
            ]);
            setStats({
                totalDocuments: docs.length,
                totalTrades: trades.length,
                loading: false
            });
        } catch (error) {
            console.error('Error loading stats:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    const quickActions = [
        {
            title: 'Upload Document',
            description: 'Securely store your important files',
            icon: Upload,
            href: '/vault',
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-500/10',
            iconColor: 'text-blue-500'
        },
        {
            title: 'Add Trade',
            description: 'Log your trading activity',
            icon: TrendingUp,
            href: '/journal/new',
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-500/10',
            iconColor: 'text-green-500'
        },
        {
            title: 'View Analytics',
            description: 'Analyze your trading performance',
            icon: BarChart3,
            href: '/analytics',
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-500/10',
            iconColor: 'text-purple-500'
        },
        {
            title: 'Trading Playbook',
            description: 'Review your strategies',
            icon: Target,
            href: '/playbook',
            color: 'from-orange-500 to-orange-600',
            bgColor: 'bg-orange-500/10',
            iconColor: 'text-orange-500'
        }
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="min-h-screen">
            <Header
                title={`${getGreeting()}, ${user?.displayName || 'Trader'}!`}
                subtitle="Welcome to your secure vault and trading journal"
            />

            <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <Card className="p-4 lg:p-6">
                        <div className="flex items-center gap-3 lg:gap-4">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl lg:text-2xl font-bold text-foreground">
                                    {stats.loading ? '—' : stats.totalDocuments}
                                </p>
                                <p className="text-xs lg:text-sm text-foreground-muted truncate">Documents</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 lg:p-6">
                        <div className="flex items-center gap-3 lg:gap-4">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl lg:text-2xl font-bold text-foreground">
                                    {stats.loading ? '—' : stats.totalTrades}
                                </p>
                                <p className="text-xs lg:text-sm text-foreground-muted truncate">Trades</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 lg:p-6">
                        <div className="flex items-center gap-3 lg:gap-4">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <Wallet className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl lg:text-2xl font-bold text-foreground">—</p>
                                <p className="text-xs lg:text-sm text-foreground-muted truncate">Net P&L</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 lg:p-6">
                        <div className="flex items-center gap-3 lg:gap-4">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-orange-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl lg:text-2xl font-bold text-foreground">—</p>
                                <p className="text-xs lg:text-sm text-foreground-muted truncate">Win Rate</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-lg lg:text-xl font-bold text-foreground mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Link href={action.href} key={action.title}>
                                    <Card
                                        hover
                                        className="h-full p-4 lg:p-6 group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                                    >
                                        <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl ${action.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                            <Icon className={`w-6 h-6 lg:w-7 lg:h-7 ${action.iconColor}`} />
                                        </div>
                                        <h3 className="font-semibold text-foreground text-sm lg:text-base mb-1 lg:mb-2">
                                            {action.title}
                                        </h3>
                                        <p className="text-xs lg:text-sm text-foreground-muted mb-3 lg:mb-4">
                                            {action.description}
                                        </p>
                                        <div className="flex items-center text-accent group-hover:gap-2 gap-1 transition-all text-xs lg:text-sm">
                                            <span>Get started</span>
                                            <ArrowRight className="w-3 h-3 lg:w-4 lg:h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activity - Placeholder */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg lg:text-xl font-bold text-foreground">Recent Activity</h2>
                        <Link href="/journal">
                            <Button variant="ghost" size="sm">
                                View All
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                    <Card className="p-6 lg:p-8 text-center">
                        <Clock className="w-10 h-10 lg:w-12 lg:h-12 mx-auto mb-4 text-foreground-muted" />
                        <p className="text-foreground-muted text-sm lg:text-base">
                            Your recent trades and uploads will appear here
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
