// User types
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    lastGlobalLogoutTime: number;
    createdAt: number;
}

export interface UserSettings {
    theme: 'dark' | 'light';
    notifications: boolean;
    defaultStampDutyState: string;
    brokerageRate: number;
}

// Document types
export interface Document {
    id: string;
    userId: string;
    fileName: string;
    fileType: 'pdf' | 'jpg' | 'png';
    fileUrl: string;
    storageRef: string;
    tags: string[];
    expiryDate: number | null;
    isOfflineAvailable: boolean;
    uploadedAt: number;
    updatedAt: number;
}

export interface ShareLink {
    id: string;
    documentId: string;
    userId: string;
    createdAt: number;
    expiresAt: number;
    viewCount: number;
    maxViews: number;
    isActive: boolean;
    auditLog: ShareAuditEntry[];
}

export interface ShareAuditEntry {
    action: 'created' | 'viewed' | 'expired';
    timestamp: number;
    ipAddress?: string;
}

// Trade types
export type TradeType = 'BUY' | 'SELL';
export type Instrument = 'EQUITY' | 'FUTURES' | 'OPTIONS' | 'COMMODITIES';

export interface Trade {
    id: string;
    userId: string;
    date: number;
    instrument: Instrument;
    symbol: string;
    type: TradeType;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    lotSize?: number;
    strikePrice?: number;
    optionType?: 'CE' | 'PE';
    expiryDate?: number;

    // P&L
    grossPnL: number;
    netPnL: number;
    charges: TradeCharges;

    // Psychology & Strategy
    strategy: string;
    mistakes: string[];
    mood: MoodType;
    notes: string;

    // Playbook
    playbookRuleId: string | null;
    followedRule: boolean | null;

    // Attachments
    screenshotUrl: string | null;
    screenshotRef: string | null;

    createdAt: number;
    updatedAt: number;
}

export interface TradeCharges {
    stt: number;
    exchangeCharges: number;
    gst: number;
    stampDuty: number;
    sebiCharges: number;
    brokerage: number;
    totalCharges: number;
}

export type MoodType = 'calm' | 'confident' | 'nervous' | 'fearful' | 'tilted' | 'neutral';

export const MOOD_OPTIONS: { value: MoodType; label: string; emoji: string }[] = [
    { value: 'calm', label: 'Calm', emoji: '😎' },
    { value: 'confident', label: 'Confident', emoji: '💪' },
    { value: 'nervous', label: 'Nervous', emoji: '😰' },
    { value: 'fearful', label: 'Fearful', emoji: '😨' },
    { value: 'tilted', label: 'Tilted', emoji: '😡' },
    { value: 'neutral', label: 'Neutral', emoji: '😐' },
];

export const STRATEGY_OPTIONS = [
    'Gap Up',
    'Gap Down',
    'Trend Following',
    'Breakout',
    'Breakdown',
    'Scalping',
    'Expiry HeroZero',
    'Range Trading',
    'Momentum',
    'Mean Reversion',
    'News Based',
    'Support/Resistance',
    'Other',
];

export const MISTAKE_OPTIONS = [
    'Revenge Trading',
    'Over Sizing',
    'No Stop Loss',
    'Early Exit',
    'Late Entry',
    'FOMO',
    'Ignored System',
    'Over Trading',
    'Averaging Down',
    'Wrong Direction',
    'Poor Risk Management',
    'Emotional Decision',
    'Other',
];

// Playbook types
export interface PlaybookRule {
    id: string;
    userId: string;
    strategyName: string;
    rules: string[];
    description: string;
    linkedTrades: string[];
    createdAt: number;
    updatedAt: number;
}

// Notification types
export type NotificationType = 'expiry_warning' | 'expiry_critical' | 'share_viewed' | 'system';

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    documentId?: string;
    isRead: boolean;
    createdAt: number;
}

// Default tags
export const DEFAULT_TAGS = [
    { name: 'Identity', color: '#3b82f6' },
    { name: 'Medical', color: '#10b981' },
    { name: 'Property', color: '#8b5cf6' },
    { name: 'Finance', color: '#f59e0b' },
    { name: 'Vehicle', color: '#6366f1' },
    { name: 'Insurance', color: '#ec4899' },
    { name: 'Education', color: '#14b8a6' },
    { name: 'Travel', color: '#f97316' },
    { name: 'Work', color: '#64748b' },
];

// Analytics types
export interface DailyPnL {
    date: string;
    grossPnL: number;
    netPnL: number;
    tradeCount: number;
    winCount: number;
    lossCount: number;
}

export interface StrategyStats {
    strategy: string;
    totalTrades: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    totalGrossPnL: number;
    totalNetPnL: number;
    averagePnL: number;
}

export interface LeakageReport {
    totalGrossProfit: number;
    totalTaxesPaid: number;
    leakagePercentage: number;
    breakdown: {
        stt: number;
        exchangeCharges: number;
        gst: number;
        stampDuty: number;
        sebiCharges: number;
        brokerage: number;
    };
}
