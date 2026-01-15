'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, TrendingUp, TrendingDown,
    Trash2, AlertCircle, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

import { Button, Card, CardHeader, Badge, Modal, ModalActions } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getTrade, deleteTrade } from '@/lib/firestore';
import { Trade, MOOD_OPTIONS } from '@/types';
import { formatINR } from '@/lib/tax-calculator';

export default function TradeDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [trade, setTrade] = useState<Trade | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showChargesBreakdown, setShowChargesBreakdown] = useState(false);

    useEffect(() => {
        if (user && id) {
            loadTrade();
        }
    }, [user, id]);

    const loadTrade = async () => {
        if (!user || !id) return;
        try {
            const tradeData = await getTrade(user.uid, id as string);
            setTrade(tradeData);
        } catch (error) {
            console.error('Error loading trade:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user || !trade) return;
        setDeleting(true);
        try {
            await deleteTrade(user.uid, trade.id);
            router.push('/journal');
        } catch (error) {
            console.error('Error deleting trade:', error);
            alert('Failed to delete trade');
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const getMoodInfo = (mood: string) => {
        return MOOD_OPTIONS.find((m) => m.value === mood) || { emoji: '😐', label: 'Neutral' };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!trade) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <AlertCircle className="w-16 h-16 text-foreground-muted" />
                <h1 className="text-2xl font-bold text-foreground">Trade Not Found</h1>
                <p className="text-foreground-muted">The trade you're looking for doesn't exist or was deleted.</p>
                <Link href="/journal">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Journal
                    </Button>
                </Link>
            </div>
        );
    }

    const moodInfo = getMoodInfo(trade.mood);
    const isProfit = trade.netPnL >= 0;

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="p-6 pb-0">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-foreground-muted hover:text-foreground mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Journal
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl">{moodInfo.emoji}</span>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-foreground">{trade.symbol}</h1>
                                <Badge variant={trade.type === 'BUY' ? 'success' : 'danger'}>
                                    {trade.type}
                                </Badge>
                                <Badge variant="primary">
                                    {trade.instrument}
                                </Badge>
                            </div>
                            <p className="text-foreground-muted flex items-center gap-2 mt-1">
                                <Calendar className="w-4 h-4" />
                                {format(trade.date, 'EEEE, MMMM d, yyyy')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteModal(true)}>
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Trade Details */}
                        <Card>
                            <CardHeader title="Trade Details" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-sm text-foreground-muted mb-1">Entry Price</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {formatINR(trade.entryPrice)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-foreground-muted mb-1">Exit Price</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {formatINR(trade.exitPrice)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-foreground-muted mb-1">Quantity</p>
                                    <p className="text-lg font-semibold text-foreground">{trade.quantity}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-foreground-muted mb-1">Lot Size</p>
                                    <p className="text-lg font-semibold text-foreground">{trade.lotSize || 1}</p>
                                </div>
                            </div>

                            {/* Options specific fields */}
                            {trade.instrument === 'OPTIONS' && (trade.strikePrice || trade.optionType) && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-border">
                                    {trade.strikePrice && (
                                        <div>
                                            <p className="text-sm text-foreground-muted mb-1">Strike Price</p>
                                            <p className="text-lg font-semibold text-foreground">
                                                {formatINR(trade.strikePrice)}
                                            </p>
                                        </div>
                                    )}
                                    {trade.optionType && (
                                        <div>
                                            <p className="text-sm text-foreground-muted mb-1">Option Type</p>
                                            <Badge variant={trade.optionType === 'CE' ? 'success' : 'danger'}>
                                                {trade.optionType === 'CE' ? 'Call (CE)' : 'Put (PE)'}
                                            </Badge>
                                        </div>
                                    )}
                                    {trade.expiryDate && (
                                        <div>
                                            <p className="text-sm text-foreground-muted mb-1">Expiry Date</p>
                                            <p className="text-foreground">
                                                {format(trade.expiryDate, 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>

                        {/* Strategy & Psychology */}
                        <Card>
                            <CardHeader title="Strategy & Psychology" />
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div>
                                        <p className="text-sm text-foreground-muted mb-1">Strategy</p>
                                        <Badge variant="primary">{trade.strategy}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-foreground-muted mb-1">Mood</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{moodInfo.emoji}</span>
                                            <span className="text-foreground">{moodInfo.label}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mistakes */}
                                {trade.mistakes && trade.mistakes.length > 0 && (
                                    <div>
                                        <p className="text-sm text-foreground-muted mb-2">Mistakes Identified</p>
                                        <div className="flex flex-wrap gap-2">
                                            {trade.mistakes.map((mistake) => (
                                                <Badge key={mistake} variant="danger">
                                                    {mistake}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {trade.notes && (
                                    <div>
                                        <p className="text-sm text-foreground-muted mb-2">Notes</p>
                                        <div className="p-4 bg-background-tertiary rounded-lg">
                                            <p className="text-foreground whitespace-pre-wrap">{trade.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Screenshot */}
                        {trade.screenshotUrl && (
                            <Card>
                                <CardHeader
                                    title="Trade Screenshot"
                                    action={
                                        <a
                                            href={trade.screenshotUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-accent hover:text-accent-hover flex items-center gap-1 text-sm"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open Full Size
                                        </a>
                                    }
                                />
                                <img
                                    src={trade.screenshotUrl}
                                    alt="Trade screenshot"
                                    className="w-full rounded-lg border border-border"
                                />
                            </Card>
                        )}
                    </div>

                    {/* Sidebar - P&L Summary */}
                    <div className="space-y-6">
                        {/* P&L Card */}
                        <Card className={`${isProfit ? 'border-success/30' : 'border-danger/30'}`}>
                            <CardHeader
                                title="P&L Summary"
                                action={
                                    <button
                                        onClick={() => setShowChargesBreakdown(!showChargesBreakdown)}
                                        className="text-sm text-accent hover:text-accent-hover flex items-center gap-1"
                                    >
                                        {showChargesBreakdown ? (
                                            <>
                                                <ChevronUp className="w-4 h-4" />
                                                Hide
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-4 h-4" />
                                                Show breakdown
                                            </>
                                        )}
                                    </button>
                                }
                            />

                            <div className="space-y-4">
                                {/* Gross P&L */}
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground-muted">Gross P&L</span>
                                    <span className={`text-lg font-semibold ${trade.grossPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {trade.grossPnL >= 0 ? '+' : ''}{formatINR(trade.grossPnL)}
                                    </span>
                                </div>

                                {/* Charges Breakdown */}
                                {showChargesBreakdown && trade.charges && (
                                    <div className="p-3 bg-background-tertiary rounded-lg space-y-2 text-sm">
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>STT</span>
                                            <span>-{formatINR(trade.charges.stt)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>Exchange Charges</span>
                                            <span>-{formatINR(trade.charges.exchangeCharges)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>GST (18%)</span>
                                            <span>-{formatINR(trade.charges.gst)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>Stamp Duty</span>
                                            <span>-{formatINR(trade.charges.stampDuty)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>SEBI Charges</span>
                                            <span>-{formatINR(trade.charges.sebiCharges)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>Brokerage</span>
                                            <span>-{formatINR(trade.charges.brokerage)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Total Charges */}
                                {trade.charges && (
                                    <div className="flex items-center justify-between text-foreground-muted">
                                        <span>Total Charges</span>
                                        <span className="text-danger">-{formatINR(trade.charges.totalCharges)}</span>
                                    </div>
                                )}

                                {/* Net P&L */}
                                <div className="border-t border-border pt-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-foreground font-medium">Net P&L</span>
                                        <div className="flex items-center gap-2">
                                            {isProfit ? (
                                                <TrendingUp className="w-5 h-5 text-success" />
                                            ) : (
                                                <TrendingDown className="w-5 h-5 text-danger" />
                                            )}
                                            <span className={`text-2xl font-bold ${isProfit ? 'text-success' : 'text-danger'}`}>
                                                {isProfit ? '+' : ''}{formatINR(trade.netPnL)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Leakage */}
                                {trade.grossPnL > 0 && (
                                    <p className="text-xs text-foreground-muted text-center">
                                        Tax leakage: {((1 - trade.netPnL / trade.grossPnL) * 100).toFixed(1)}% of profit
                                    </p>
                                )}
                            </div>
                        </Card>

                        {/* Trade Stats */}
                        <Card>
                            <CardHeader title="Trade Statistics" />
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-foreground-muted">Price Change</span>
                                    <span className={`font-medium ${trade.exitPrice >= trade.entryPrice ? 'text-success' : 'text-danger'}`}>
                                        {((trade.exitPrice - trade.entryPrice) / trade.entryPrice * 100).toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-foreground-muted">Points Movement</span>
                                    <span className="text-foreground font-medium">
                                        {(trade.exitPrice - trade.entryPrice).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-foreground-muted">Total Value</span>
                                    <span className="text-foreground font-medium">
                                        {formatINR(trade.entryPrice * trade.quantity * (trade.lotSize || 1))}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Metadata */}
                        <Card className="bg-background-tertiary/50">
                            <div className="text-xs text-foreground-muted space-y-1">
                                <p>Created: {format(trade.createdAt, 'MMM d, yyyy h:mm a')}</p>
                                <p>Updated: {format(trade.updatedAt, 'MMM d, yyyy h:mm a')}</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Trade"
            >
                <p className="text-foreground-muted">
                    Are you sure you want to delete this trade? This action cannot be undone.
                </p>
                <ModalActions>
                    <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete} loading={deleting}>
                        <Trash2 className="w-4 h-4" />
                        Delete Trade
                    </Button>
                </ModalActions>
            </Modal>
        </div>
    );
}
