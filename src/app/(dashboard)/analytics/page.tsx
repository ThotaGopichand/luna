'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Calendar, BarChart3, PieChart,
    ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from 'date-fns';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';
import { Header } from '@/components/layout';
import { Card, CardHeader, Button, Select } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getTrades } from '@/lib/firestore';
import { Trade, DailyPnL, StrategyStats, LeakageReport } from '@/types';
import { formatINR, formatIndianNumber } from '@/lib/tax-calculator';

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30'); // days
    const [pnlView, setPnlView] = useState<'gross' | 'net'>('net');

    useEffect(() => {
        if (user) loadTrades();
    }, [user]);

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

    // Filter trades by time range
    const filteredTrades = useMemo(() => {
        const cutoff = Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000;
        return trades.filter((t) => t.date >= cutoff);
    }, [trades, timeRange]);

    // Calculate daily P&L for equity curve
    const equityCurveData = useMemo(() => {
        const dailyMap = new Map<string, DailyPnL>();

        filteredTrades.forEach((trade) => {
            const dateKey = format(trade.date, 'yyyy-MM-dd');
            const existing = dailyMap.get(dateKey) || {
                date: dateKey,
                grossPnL: 0,
                netPnL: 0,
                tradeCount: 0,
                winCount: 0,
                lossCount: 0,
            };

            existing.grossPnL += trade.grossPnL;
            existing.netPnL += trade.netPnL;
            existing.tradeCount += 1;
            if (trade.netPnL > 0) existing.winCount += 1;
            if (trade.netPnL < 0) existing.lossCount += 1;

            dailyMap.set(dateKey, existing);
        });

        // Sort by date and calculate cumulative
        const sorted = Array.from(dailyMap.values()).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let cumulativeGross = 0;
        let cumulativeNet = 0;

        return sorted.map((day) => {
            cumulativeGross += day.grossPnL;
            cumulativeNet += day.netPnL;
            return {
                ...day,
                displayDate: format(new Date(day.date), 'MMM d'),
                cumulativeGross,
                cumulativeNet,
            };
        });
    }, [filteredTrades]);

    // Calendar heatmap data
    const calendarData = useMemo(() => {
        const today = new Date();
        const startDate = subMonths(startOfMonth(today), 2);
        const endDate = endOfMonth(today);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const dailyPnL = new Map<string, number>();
        filteredTrades.forEach((trade) => {
            const dateKey = format(trade.date, 'yyyy-MM-dd');
            dailyPnL.set(dateKey, (dailyPnL.get(dateKey) || 0) + trade.netPnL);
        });

        return days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const pnl = dailyPnL.get(dateKey);
            return {
                date: day,
                dateKey,
                pnl,
                intensity: pnl ? Math.min(4, Math.floor(Math.abs(pnl) / 1000) + 1) : 0,
            };
        });
    }, [filteredTrades]);

    // Strategy stats
    const strategyStats = useMemo(() => {
        const statsMap = new Map<string, StrategyStats>();

        filteredTrades.forEach((trade) => {
            const existing = statsMap.get(trade.strategy) || {
                strategy: trade.strategy,
                totalTrades: 0,
                winCount: 0,
                lossCount: 0,
                winRate: 0,
                totalGrossPnL: 0,
                totalNetPnL: 0,
                averagePnL: 0,
            };

            existing.totalTrades += 1;
            existing.totalGrossPnL += trade.grossPnL;
            existing.totalNetPnL += trade.netPnL;
            if (trade.netPnL > 0) existing.winCount += 1;
            if (trade.netPnL < 0) existing.lossCount += 1;

            statsMap.set(trade.strategy, existing);
        });

        return Array.from(statsMap.values()).map((stat) => ({
            ...stat,
            winRate: stat.totalTrades > 0 ? (stat.winCount / stat.totalTrades) * 100 : 0,
            averagePnL: stat.totalTrades > 0 ? stat.totalNetPnL / stat.totalTrades : 0,
        }));
    }, [filteredTrades]);

    // Leakage report
    const leakageReport = useMemo((): LeakageReport => {
        const totalGross = filteredTrades.reduce((sum, t) => sum + (t.grossPnL > 0 ? t.grossPnL : 0), 0);
        const breakdown = {
            stt: 0,
            exchangeCharges: 0,
            gst: 0,
            stampDuty: 0,
            sebiCharges: 0,
            brokerage: 0,
        };

        filteredTrades.forEach((trade) => {
            breakdown.stt += trade.charges.stt;
            breakdown.exchangeCharges += trade.charges.exchangeCharges;
            breakdown.gst += trade.charges.gst;
            breakdown.stampDuty += trade.charges.stampDuty;
            breakdown.sebiCharges += trade.charges.sebiCharges;
            breakdown.brokerage += trade.charges.brokerage;
        });

        const totalTaxes = Object.values(breakdown).reduce((a, b) => a + b, 0);

        return {
            totalGrossProfit: totalGross,
            totalTaxesPaid: totalTaxes,
            leakagePercentage: totalGross > 0 ? (totalTaxes / totalGross) * 100 : 0,
            breakdown,
        };
    }, [filteredTrades]);

    // Chart colors
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

    // Summary stats
    const totalNetPnL = filteredTrades.reduce((sum, t) => sum + t.netPnL, 0);
    const totalGrossPnL = filteredTrades.reduce((sum, t) => sum + t.grossPnL, 0);
    const winCount = filteredTrades.filter((t) => t.netPnL > 0).length;
    const winRate = filteredTrades.length > 0 ? (winCount / filteredTrades.length) * 100 : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Header
                title="Analytics"
                subtitle="Visual insights into your trading performance"
                actions={
                    <Select
                        options={[
                            { value: '7', label: 'Last 7 days' },
                            { value: '30', label: 'Last 30 days' },
                            { value: '90', label: 'Last 90 days' },
                            { value: '365', label: 'Last year' },
                        ]}
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                    />
                }
            />

            <div className="p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${totalNetPnL >= 0 ? 'bg-success/10' : 'bg-danger/10'} flex items-center justify-center`}>
                                {totalNetPnL >= 0 ? (
                                    <ArrowUpRight className="w-5 h-5 text-success" />
                                ) : (
                                    <ArrowDownRight className="w-5 h-5 text-danger" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-foreground-muted">Net P&L</p>
                                <p className={`text-xl font-bold ${totalNetPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {formatIndianNumber(totalNetPnL)}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm text-foreground-muted">Total Trades</p>
                                <p className="text-xl font-bold text-foreground">{filteredTrades.length}</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-success" />
                            </div>
                            <div>
                                <p className="text-sm text-foreground-muted">Win Rate</p>
                                <p className="text-xl font-bold text-foreground">{winRate.toFixed(1)}%</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                                <p className="text-sm text-foreground-muted">Tax Leakage</p>
                                <p className="text-xl font-bold text-foreground">
                                    {formatIndianNumber(leakageReport.totalTaxesPaid)}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Equity Curve */}
                <Card>
                    <CardHeader
                        title="Equity Curve"
                        subtitle="Cumulative P&L over time"
                        action={
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={pnlView === 'gross' ? 'primary' : 'ghost'}
                                    onClick={() => setPnlView('gross')}
                                >
                                    Gross
                                </Button>
                                <Button
                                    size="sm"
                                    variant={pnlView === 'net' ? 'primary' : 'ghost'}
                                    onClick={() => setPnlView('net')}
                                >
                                    Net
                                </Button>
                            </div>
                        }
                    />

                    {equityCurveData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-foreground-muted">
                            No trade data available
                        </div>
                    ) : (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={equityCurveData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} />
                                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => formatIndianNumber(v)} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                        }}
                                        formatter={(value) => [formatINR(value as number), pnlView === 'gross' ? 'Gross P&L' : 'Net P&L']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={pnlView === 'gross' ? 'cumulativeGross' : 'cumulativeNet'}
                                        stroke={totalNetPnL >= 0 ? '#10b981' : '#f43f5e'}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Calendar Heatmap */}
                    <Card>
                        <CardHeader title="Trading Calendar" subtitle="Daily P&L heatmap" />

                        <div className="space-y-2">
                            {/* Week labels */}
                            <div className="flex gap-1 text-xs text-foreground-subtle ml-[52px]">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                                    <div key={d} className="w-4 text-center">{d[0]}</div>
                                ))}
                            </div>

                            {/* Calendar grid */}
                            <div className="flex flex-wrap gap-1">
                                {Array.from(new Set(calendarData.map((d) => format(d.date, 'MMM')))).map((month) => (
                                    <div key={month} className="flex items-center gap-1">
                                        <span className="w-12 text-xs text-foreground-subtle">{month}</span>
                                        <div className="flex flex-wrap gap-1" style={{ width: '196px' }}>
                                            {calendarData
                                                .filter((d) => format(d.date, 'MMM') === month)
                                                .map((day) => (
                                                    <div
                                                        key={day.dateKey}
                                                        className={`
                              w-4 h-4 rounded-sm cursor-pointer transition-colors
                              ${day.pnl === undefined
                                                                ? 'bg-background-tertiary'
                                                                : day.pnl > 0
                                                                    ? `bg-success/${20 + day.intensity * 20}`
                                                                    : `bg-danger/${20 + day.intensity * 20}`
                                                            }
                            `}
                                                        title={`${format(day.date, 'MMM d, yyyy')}: ${day.pnl !== undefined ? formatINR(day.pnl) : 'No trades'}`}
                                                        style={{
                                                            backgroundColor: day.pnl === undefined
                                                                ? undefined
                                                                : day.pnl > 0
                                                                    ? `rgba(16, 185, 129, ${0.2 + day.intensity * 0.2})`
                                                                    : `rgba(244, 63, 94, ${0.2 + day.intensity * 0.2})`,
                                                        }}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-foreground-muted">
                                <span>Loss</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className="w-3 h-3 rounded-sm"
                                            style={{ backgroundColor: `rgba(244, 63, 94, ${0.2 + i * 0.2})` }}
                                        />
                                    ))}
                                </div>
                                <span>No trade</span>
                                <div className="w-3 h-3 rounded-sm bg-background-tertiary" />
                                <span>Profit</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className="w-3 h-3 rounded-sm"
                                            style={{ backgroundColor: `rgba(16, 185, 129, ${0.2 + i * 0.2})` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Leakage Report - Bar Chart */}
                    <Card>
                        <CardHeader title="Leakage Report" subtitle="Where your profits go" />

                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[
                                        { name: 'STT', value: leakageReport.breakdown.stt },
                                        { name: 'Exchange', value: leakageReport.breakdown.exchangeCharges },
                                        { name: 'GST', value: leakageReport.breakdown.gst },
                                        { name: 'Stamp Duty', value: leakageReport.breakdown.stampDuty },
                                        { name: 'SEBI', value: leakageReport.breakdown.sebiCharges },
                                        { name: 'Brokerage', value: leakageReport.breakdown.brokerage },
                                    ]}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => formatIndianNumber(v)} />
                                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={80} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                        }}
                                        formatter={(value) => [formatINR(value as number), 'Amount']}
                                    />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 p-3 bg-background-tertiary rounded-lg flex items-center justify-between">
                            <span className="text-foreground-muted">Total leakage</span>
                            <span className="text-lg font-bold text-warning">
                                {formatINR(leakageReport.totalTaxesPaid)} ({leakageReport.leakagePercentage.toFixed(1)}%)
                            </span>
                        </div>
                    </Card>
                </div>

                {/* Strategy Performance */}
                <Card>
                    <CardHeader title="Strategy Performance" subtitle="Win rate by strategy" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={strategyStats.map((s) => ({ name: s.strategy, value: s.totalTrades }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {strategyStats.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                        }}
                                    />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Stats Table */}
                        <div className="space-y-2">
                            {strategyStats.map((stat, index) => (
                                <div
                                    key={stat.strategy}
                                    className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{stat.strategy}</p>
                                        <p className="text-xs text-foreground-muted">
                                            {stat.totalTrades} trades • {stat.winRate.toFixed(1)}% win rate
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-medium ${stat.totalNetPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {formatINR(stat.totalNetPnL)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
