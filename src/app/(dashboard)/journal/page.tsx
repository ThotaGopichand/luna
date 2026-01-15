'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Plus, Search, Filter, TrendingUp, TrendingDown, Calendar,
    BarChart3, Target, AlertCircle, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

import { Button, Card, Input, Badge, Select } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getTrades } from '@/lib/firestore';
import { Trade, STRATEGY_OPTIONS, MOOD_OPTIONS, Instrument } from '@/types';
import { formatINR } from '@/lib/tax-calculator';

export default function JournalPage() {
    const { user } = useAuth();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterInstrument, setFilterInstrument] = useState<string>('');
    const [filterStrategy, setFilterStrategy] = useState<string>('');

    // Stats
    const [stats, setStats] = useState({
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        totalGrossPnL: 0,
        totalNetPnL: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
    });

    useEffect(() => {
        if (user) {
            loadTrades();
        }
    }, [user]);

    useEffect(() => {
        calculateStats();
    }, [trades]);

    const loadTrades = async () => {
        if (!user) return;
        try {
            const tradeDocs = await getTrades(user.uid);
            setTrades(tradeDocs);
        } catch (error) {
            console.error('Error loading trades:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        if (trades.length === 0) {
            setStats({
                totalTrades: 0,
                winCount: 0,
                lossCount: 0,
                totalGrossPnL: 0,
                totalNetPnL: 0,
                winRate: 0,
                avgWin: 0,
                avgLoss: 0,
            });
            return;
        }

        const wins = trades.filter((t) => t.netPnL > 0);
        const losses = trades.filter((t) => t.netPnL < 0);

        const totalGross = trades.reduce((sum, t) => sum + t.grossPnL, 0);
        const totalNet = trades.reduce((sum, t) => sum + t.netPnL, 0);
        const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.netPnL, 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.netPnL, 0) / losses.length : 0;

        setStats({
            totalTrades: trades.length,
            winCount: wins.length,
            lossCount: losses.length,
            totalGrossPnL: totalGross,
            totalNetPnL: totalNet,
            winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
            avgWin,
            avgLoss,
        });
    };

    const filteredTrades = trades.filter((trade) => {
        const matchesSearch =
            !searchQuery ||
            trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trade.strategy.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesInstrument = !filterInstrument || trade.instrument === filterInstrument;
        const matchesStrategy = !filterStrategy || trade.strategy === filterStrategy;

        return matchesSearch && matchesInstrument && matchesStrategy;
    });

    const getMoodEmoji = (mood: string) => {
        return MOOD_OPTIONS.find((m) => m.value === mood)?.emoji || '😐';
    };

    return (
        <div className="min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pb-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Trading Journal</h1>
                    <p className="text-foreground-muted">Track your P&L and improve your edge</p>
                </div>
                <Link href="/journal/new">
                    <Button>
                        <Plus className="w-4 h-4" />
                        New Trade
                    </Button>
                </Link>
            </div>

            <div className="p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm text-foreground-muted">Total Trades</p>
                                <p className="text-xl font-bold text-foreground">{stats.totalTrades}</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                <Target className="w-5 h-5 text-success" />
                            </div>
                            <div>
                                <p className="text-sm text-foreground-muted">Win Rate</p>
                                <p className="text-xl font-bold text-foreground">{stats.winRate.toFixed(1)}%</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${stats.totalGrossPnL >= 0 ? 'bg-success/10' : 'bg-danger/10'} flex items-center justify-center`}>
                                {stats.totalGrossPnL >= 0 ? (
                                    <TrendingUp className="w-5 h-5 text-success" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-danger" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-foreground-muted">Gross P&L</p>
                                <p className={`text-xl font-bold ${stats.totalGrossPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {formatINR(stats.totalGrossPnL)}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${stats.totalNetPnL >= 0 ? 'bg-success/10' : 'bg-danger/10'} flex items-center justify-center`}>
                                {stats.totalNetPnL >= 0 ? (
                                    <TrendingUp className="w-5 h-5 text-success" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-danger" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-foreground-muted">Net P&L</p>
                                <p className={`text-xl font-bold ${stats.totalNetPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {formatINR(stats.totalNetPnL)}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Leakage Alert */}
                {stats.totalGrossPnL > 0 && (
                    <Card className="bg-warning/5 border-warning/20">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-warning" />
                            <div className="flex-1">
                                <p className="text-foreground font-medium">Tax Leakage</p>
                                <p className="text-sm text-foreground-muted">
                                    You've paid {formatINR(stats.totalGrossPnL - stats.totalNetPnL)} in taxes & charges ({((1 - stats.totalNetPnL / stats.totalGrossPnL) * 100).toFixed(1)}% of gross profit)
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by symbol or strategy..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <Select
                        options={[
                            { value: '', label: 'All Instruments' },
                            { value: 'EQUITY', label: 'Equity' },
                            { value: 'FUTURES', label: 'Futures' },
                            { value: 'OPTIONS', label: 'Options' },
                            { value: 'COMMODITIES', label: 'Commodities' },
                        ]}
                        value={filterInstrument}
                        onChange={(e) => setFilterInstrument(e.target.value)}
                        placeholder="Instrument"
                    />
                    <Select
                        options={[
                            { value: '', label: 'All Strategies' },
                            ...STRATEGY_OPTIONS.map((s) => ({ value: s, label: s })),
                        ]}
                        value={filterStrategy}
                        onChange={(e) => setFilterStrategy(e.target.value)}
                        placeholder="Strategy"
                    />
                </div>

                {/* Trades List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner" />
                    </div>
                ) : filteredTrades.length === 0 ? (
                    <div className="text-center py-12">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-foreground-subtle" />
                        <p className="text-foreground-muted">No trades found</p>
                        <Link href="/journal/new">
                            <Button variant="outline" className="mt-4">
                                <Plus className="w-4 h-4" />
                                Add Your First Trade
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTrades.map((trade) => (
                            <Link key={trade.id} href={`/journal/${trade.id}`}>
                                <Card hover className="flex items-center gap-4">
                                    {/* Date & Mood */}
                                    <div className="text-center min-w-[60px]">
                                        <p className="text-2xl">{getMoodEmoji(trade.mood)}</p>
                                        <p className="text-xs text-foreground-muted mt-1">
                                            {format(trade.date, 'MMM d')}
                                        </p>
                                    </div>

                                    {/* Trade Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-foreground">{trade.symbol}</p>
                                            <Badge variant={trade.type === 'BUY' ? 'success' : 'danger'} size="sm">
                                                {trade.type}
                                            </Badge>
                                            <Badge variant="primary" size="sm">
                                                {trade.instrument}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-foreground-muted">
                                            <span>{trade.strategy}</span>
                                            <span>Qty: {trade.quantity}</span>
                                            <span>Entry: {formatINR(trade.entryPrice)}</span>
                                            <span>Exit: {formatINR(trade.exitPrice)}</span>
                                        </div>
                                        {trade.mistakes.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {trade.mistakes.map((mistake) => (
                                                    <Badge key={mistake} variant="danger" size="sm">
                                                        {mistake}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* P&L */}
                                    <div className="text-right min-w-[120px]">
                                        <p className={`text-lg font-bold ${trade.netPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {trade.netPnL >= 0 ? '+' : ''}{formatINR(trade.netPnL)}
                                        </p>
                                        <p className="text-xs text-foreground-muted">
                                            Gross: {formatINR(trade.grossPnL)}
                                        </p>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-foreground-subtle" />
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
