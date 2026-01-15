'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
    ArrowLeft, Save, Upload, Sparkles, Copy, Check, Image,
    Calculator, TrendingUp, TrendingDown, X
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, Input, Select, Modal, ModalActions } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { createTrade } from '@/lib/firestore';
import { uploadFile, validateFile } from '@/lib/storage';
import {
    Trade, Instrument, TradeType, MoodType,
    STRATEGY_OPTIONS, MISTAKE_OPTIONS, MOOD_OPTIONS
} from '@/types';
import {
    calculateGrossPnL, calculateTurnover, calculateTradingCharges, calculateNetPnL, formatINR
} from '@/lib/tax-calculator';
import LunaProtocol from '@/components/journal/LunaProtocol';

export default function NewTradePage() {
    const { user, userSettings } = useAuth();
    const router = useRouter();

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [instrument, setInstrument] = useState<Instrument>('OPTIONS');
    const [symbol, setSymbol] = useState('');
    const [tradeType, setTradeType] = useState<TradeType>('BUY');
    const [entryPrice, setEntryPrice] = useState('');
    const [exitPrice, setExitPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [lotSize, setLotSize] = useState('1');
    const [strategy, setStrategy] = useState('');
    const [mood, setMood] = useState<MoodType>('neutral');
    const [mistakes, setMistakes] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

    // Calculated values
    const [grossPnL, setGrossPnL] = useState(0);
    const [netPnL, setNetPnL] = useState(0);
    const [charges, setCharges] = useState({
        stt: 0,
        exchangeCharges: 0,
        gst: 0,
        stampDuty: 0,
        sebiCharges: 0,
        brokerage: 0,
        totalCharges: 0,
    });

    // UI State
    const [saving, setSaving] = useState(false);
    const [showLunaProtocol, setShowLunaProtocol] = useState(false);
    const [showChargesBreakdown, setShowChargesBreakdown] = useState(false);

    // Calculate P&L when inputs change
    const calculatePnL = () => {
        if (!entryPrice || !exitPrice || !quantity) {
            setGrossPnL(0);
            setNetPnL(0);
            return;
        }

        const entry = parseFloat(entryPrice);
        const exit = parseFloat(exitPrice);
        const qty = parseInt(quantity);
        const lot = parseInt(lotSize) || 1;

        const gross = calculateGrossPnL(entry, exit, qty, lot, tradeType);
        const { buyValue, sellValue, turnover } = calculateTurnover(entry, exit, qty, lot);

        const calculatedCharges = calculateTradingCharges({
            instrument,
            grossPnL: gross,
            turnover,
            sellValue,
            buyValue,
            state: userSettings?.defaultStampDutyState || 'Andhra Pradesh',
            brokeragePerOrder: userSettings?.brokerageRate || 20,
        });

        const net = calculateNetPnL(gross, calculatedCharges);

        setGrossPnL(gross);
        setNetPnL(net);
        setCharges(calculatedCharges);
    };

    // Screenshot upload
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const validation = validateFile(file);
            if (validation.valid) {
                setScreenshot(file);
                setScreenshotPreview(URL.createObjectURL(file));
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
        },
        maxFiles: 1,
    });

    const removeScreenshot = () => {
        setScreenshot(null);
        if (screenshotPreview) {
            URL.revokeObjectURL(screenshotPreview);
            setScreenshotPreview(null);
        }
    };

    // Handle Luna Protocol parsed data
    const handleParsedData = (data: any) => {
        if (data.symbol) setSymbol(data.symbol);
        if (data.entryPrice) setEntryPrice(data.entryPrice.toString());
        if (data.exitPrice) setExitPrice(data.exitPrice.toString());
        if (data.quantity) setQuantity(data.quantity.toString());
        if (data.type) setTradeType(data.type);
        if (data.instrument) setInstrument(data.instrument);
        setShowLunaProtocol(false);
        calculatePnL();
    };

    // Save trade
    const handleSave = async () => {
        if (!user) return;
        if (!symbol || !entryPrice || !exitPrice || !quantity || !strategy) {
            alert('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            let screenshotUrl = null;
            let screenshotRef = null;

            if (screenshot) {
                const result = await uploadFile(user.uid, screenshot, 'screenshots');
                screenshotUrl = result.url;
                screenshotRef = result.ref;
            }

            // Calculate P&L synchronously before saving to ensure correct values
            const entry = parseFloat(entryPrice);
            const exit = parseFloat(exitPrice);
            const qty = parseInt(quantity);
            const lot = parseInt(lotSize) || 1;

            const calculatedGrossPnL = calculateGrossPnL(entry, exit, qty, lot, tradeType);
            const { buyValue, sellValue, turnover } = calculateTurnover(entry, exit, qty, lot);

            const calculatedCharges = calculateTradingCharges({
                instrument,
                grossPnL: calculatedGrossPnL,
                turnover,
                sellValue,
                buyValue,
                state: userSettings?.defaultStampDutyState || 'Andhra Pradesh',
                brokeragePerOrder: userSettings?.brokerageRate || 20,
            });

            const calculatedNetPnL = calculateNetPnL(calculatedGrossPnL, calculatedCharges);

            const trade: Omit<Trade, 'id'> = {
                userId: user.uid,
                date: new Date(date).getTime(),
                instrument,
                symbol: symbol.toUpperCase(),
                type: tradeType,
                entryPrice: entry,
                exitPrice: exit,
                quantity: qty,
                lotSize: lot,
                grossPnL: calculatedGrossPnL,
                netPnL: calculatedNetPnL,
                charges: calculatedCharges,
                strategy,
                mistakes,
                mood,
                notes,
                playbookRuleId: null,
                followedRule: null,
                screenshotUrl,
                screenshotRef,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            await createTrade(user.uid, trade);
            router.push('/journal');
        } catch (error) {
            console.error('Error saving trade:', error);
            alert('Failed to save trade');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen">
            <Header
                title="New Trade"
                subtitle="Log your trade with full P&L breakdown"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowLunaProtocol(true)}>
                            <Sparkles className="w-4 h-4" />
                            Luna Protocol
                        </Button>
                        <Button onClick={handleSave} loading={saving}>
                            <Save className="w-4 h-4" />
                            Save Trade
                        </Button>
                    </div>
                }
            />

            <div className="p-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-foreground-muted hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Journal
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Trade Details */}
                        <Card>
                            <CardHeader title="Trade Details" subtitle="Enter your trade information" />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Input
                                    label="Date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                                <Select
                                    label="Instrument"
                                    options={[
                                        { value: 'OPTIONS', label: 'Options' },
                                        { value: 'FUTURES', label: 'Futures' },
                                        { value: 'EQUITY', label: 'Equity' },
                                        { value: 'COMMODITIES', label: 'Commodities' },
                                    ]}
                                    value={instrument}
                                    onChange={(e) => setInstrument(e.target.value as Instrument)}
                                />
                                <Input
                                    label="Symbol"
                                    placeholder="e.g., NIFTY"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                />
                                <Select
                                    label="Type"
                                    options={[
                                        { value: 'BUY', label: 'Buy (Long)' },
                                        { value: 'SELL', label: 'Sell (Short)' },
                                    ]}
                                    value={tradeType}
                                    onChange={(e) => setTradeType(e.target.value as TradeType)}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <Input
                                    label="Entry Price"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={entryPrice}
                                    onChange={(e) => {
                                        setEntryPrice(e.target.value);
                                        setTimeout(calculatePnL, 0);
                                    }}
                                />
                                <Input
                                    label="Exit Price"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={exitPrice}
                                    onChange={(e) => {
                                        setExitPrice(e.target.value);
                                        setTimeout(calculatePnL, 0);
                                    }}
                                />
                                <Input
                                    label="Quantity"
                                    type="number"
                                    placeholder="1"
                                    value={quantity}
                                    onChange={(e) => {
                                        setQuantity(e.target.value);
                                        setTimeout(calculatePnL, 0);
                                    }}
                                />
                                <Input
                                    label="Lot Size"
                                    type="number"
                                    placeholder="1"
                                    value={lotSize}
                                    onChange={(e) => {
                                        setLotSize(e.target.value);
                                        setTimeout(calculatePnL, 0);
                                    }}
                                    hint="For F&O trades"
                                />
                            </div>
                        </Card>

                        {/* Strategy & Psychology */}
                        <Card>
                            <CardHeader title="Strategy & Psychology" subtitle="Track your mindset and approach" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    label="Strategy"
                                    options={STRATEGY_OPTIONS.map((s) => ({ value: s, label: s }))}
                                    value={strategy}
                                    onChange={(e) => setStrategy(e.target.value)}
                                    placeholder="Select strategy"
                                />

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Mood
                                    </label>
                                    <div className="flex gap-2">
                                        {MOOD_OPTIONS.map((m) => (
                                            <button
                                                key={m.value}
                                                onClick={() => setMood(m.value)}
                                                className={`
                          flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                          ${mood === m.value
                                                        ? 'bg-accent/20 border border-accent/50'
                                                        : 'bg-background-tertiary border border-transparent hover:border-border'
                                                    }
                        `}
                                                title={m.label}
                                            >
                                                <span className="text-xl">{m.emoji}</span>
                                                <span className="text-xs text-foreground-muted">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Mistakes (for losing trades) */}
                            {netPnL < 0 && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        What went wrong? (Select all that apply)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {MISTAKE_OPTIONS.map((mistake) => (
                                            <button
                                                key={mistake}
                                                onClick={() => {
                                                    setMistakes((prev) =>
                                                        prev.includes(mistake)
                                                            ? prev.filter((m) => m !== mistake)
                                                            : [...prev, mistake]
                                                    );
                                                }}
                                                className={`
                          px-3 py-1.5 text-sm rounded-lg transition-all
                          ${mistakes.includes(mistake)
                                                        ? 'bg-danger/20 text-danger border border-danger/50'
                                                        : 'bg-background-tertiary text-foreground-muted border border-transparent hover:border-border'
                                                    }
                        `}
                                            >
                                                {mistake}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Notes
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="What did you learn from this trade?"
                                    className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                                    rows={3}
                                />
                            </div>
                        </Card>

                        {/* Screenshot */}
                        <Card>
                            <CardHeader title="Proof Attachment" subtitle="Upload trade screenshot" />

                            {screenshotPreview ? (
                                <div className="relative">
                                    <img
                                        src={screenshotPreview}
                                        alt="Trade screenshot"
                                        className="w-full rounded-lg border border-border"
                                    />
                                    <button
                                        onClick={removeScreenshot}
                                        className="absolute top-2 right-2 p-2 bg-background-secondary/90 backdrop-blur rounded-full text-foreground-muted hover:text-foreground transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    {...getRootProps()}
                                    className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragActive
                                            ? 'border-accent bg-accent/5'
                                            : 'border-border hover:border-border-light'
                                        }
                  `}
                                >
                                    <input {...getInputProps()} />
                                    <Image className="w-8 h-8 mx-auto mb-3 text-foreground-muted" />
                                    <p className="text-foreground-muted">
                                        Drag & drop screenshot or click to browse
                                    </p>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* P&L Summary Sidebar */}
                    <div className="space-y-6">
                        {/* P&L Card */}
                        <Card className={`${netPnL >= 0 ? 'border-success/30' : 'border-danger/30'}`}>
                            <CardHeader
                                title="P&L Summary"
                                action={
                                    <button
                                        onClick={() => setShowChargesBreakdown(!showChargesBreakdown)}
                                        className="text-sm text-accent hover:text-accent-hover"
                                    >
                                        {showChargesBreakdown ? 'Hide' : 'Show'} breakdown
                                    </button>
                                }
                            />

                            <div className="space-y-4">
                                {/* Gross P&L */}
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground-muted">Gross P&L</span>
                                    <span className={`text-lg font-semibold ${grossPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {grossPnL >= 0 ? '+' : ''}{formatINR(grossPnL)}
                                    </span>
                                </div>

                                {/* Charges */}
                                {showChargesBreakdown && charges.totalCharges > 0 && (
                                    <div className="p-3 bg-background-tertiary rounded-lg space-y-2 text-sm">
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>STT</span>
                                            <span>-{formatINR(charges.stt)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>Exchange Charges</span>
                                            <span>-{formatINR(charges.exchangeCharges)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>GST (18%)</span>
                                            <span>-{formatINR(charges.gst)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>Stamp Duty</span>
                                            <span>-{formatINR(charges.stampDuty)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>SEBI Charges</span>
                                            <span>-{formatINR(charges.sebiCharges)}</span>
                                        </div>
                                        <div className="flex justify-between text-foreground-muted">
                                            <span>Brokerage</span>
                                            <span>-{formatINR(charges.brokerage)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Total Charges */}
                                <div className="flex items-center justify-between text-foreground-muted">
                                    <span>Total Charges</span>
                                    <span className="text-danger">-{formatINR(charges.totalCharges)}</span>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-border pt-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-foreground font-medium">Net P&L</span>
                                        <div className="flex items-center gap-2">
                                            {netPnL >= 0 ? (
                                                <TrendingUp className="w-5 h-5 text-success" />
                                            ) : (
                                                <TrendingDown className="w-5 h-5 text-danger" />
                                            )}
                                            <span className={`text-2xl font-bold ${netPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {netPnL >= 0 ? '+' : ''}{formatINR(netPnL)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Leakage */}
                                {grossPnL > 0 && (
                                    <p className="text-xs text-foreground-muted text-center">
                                        Tax leakage: {((1 - netPnL / grossPnL) * 100).toFixed(1)}% of profit
                                    </p>
                                )}
                            </div>
                        </Card>

                        {/* Quick Tips */}
                        <Card className="bg-accent/5 border-accent/20">
                            <div className="flex items-start gap-3">
                                <Calculator className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">True P&L Calculator</p>
                                    <p className="text-xs text-foreground-muted mt-1">
                                        Automatically calculates STT, exchange charges, GST, stamp duty, and brokerage for accurate net P&L.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Luna Protocol Modal */}
            <LunaProtocol
                isOpen={showLunaProtocol}
                onClose={() => setShowLunaProtocol(false)}
                onParsed={handleParsedData}
            />
        </div>
    );
}
