import { TradeCharges, Instrument } from '@/types';

// Current Tax Rates (as of 2024)
export const TAX_RATES = {
    // Securities Transaction Tax
    STT: {
        OPTIONS_SELL: 0.000625, // 0.0625% on sell premium
        FUTURES: 0.0001, // 0.01% on sell side
        EQUITY_DELIVERY: 0.001, // 0.1% on both buy and sell
        EQUITY_INTRADAY: 0.00025, // 0.025% on sell side
    },

    // Exchange Transaction Charges
    EXCHANGE: {
        NSE_OPTIONS: 0.00053, // 0.053%
        NSE_FUTURES: 0.0002, // 0.02%
        NSE_EQUITY: 0.00035, // 0.035%
        BSE: 0.000375, // 0.0375%
    },

    // SEBI Charges
    SEBI: 0.000001, // ₹10 per crore = 0.0001%

    // GST on brokerage + exchange + SEBI
    GST: 0.18, // 18%

    // Stamp Duty (state-wise, using Andhra Pradesh as default)
    STAMP_DUTY: {
        'Andhra Pradesh': 0.00015, // 0.015%
        'Maharashtra': 0.00015, // 0.015%
        'Gujarat': 0.00015,
        'Karnataka': 0.00015,
        'Delhi': 0.00015,
        'Tamil Nadu': 0.00015,
        'Telangana': 0.00015,
        'West Bengal': 0.00015,
        'Rajasthan': 0.00015,
        'Other': 0.00015,
    } as Record<string, number>,
};

interface TaxCalculationParams {
    instrument: Instrument;
    grossPnL: number;
    turnover: number; // Total value of trade (entry + exit)
    sellValue: number;
    buyValue: number;
    isIntraday?: boolean;
    state?: string;
    brokeragePerOrder?: number;
    numberOfOrders?: number;
}

/**
 * Calculate all trading charges for Indian markets
 */
export function calculateTradingCharges(params: TaxCalculationParams): TradeCharges {
    const {
        instrument,
        turnover,
        sellValue,
        buyValue,
        isIntraday = true,
        state = 'Andhra Pradesh',
        brokeragePerOrder = 20,
        numberOfOrders = 2, // Entry + Exit
    } = params;

    let stt = 0;
    let exchangeCharges = 0;

    // Calculate STT based on instrument type
    switch (instrument) {
        case 'OPTIONS':
            stt = sellValue * TAX_RATES.STT.OPTIONS_SELL;
            exchangeCharges = turnover * TAX_RATES.EXCHANGE.NSE_OPTIONS;
            break;
        case 'FUTURES':
            stt = sellValue * TAX_RATES.STT.FUTURES;
            exchangeCharges = turnover * TAX_RATES.EXCHANGE.NSE_FUTURES;
            break;
        case 'EQUITY':
            if (isIntraday) {
                stt = sellValue * TAX_RATES.STT.EQUITY_INTRADAY;
            } else {
                stt = (buyValue + sellValue) * TAX_RATES.STT.EQUITY_DELIVERY;
            }
            exchangeCharges = turnover * TAX_RATES.EXCHANGE.NSE_EQUITY;
            break;
        case 'COMMODITIES':
            stt = 0; // CTT for commodities, simplified here
            exchangeCharges = turnover * 0.00026; // Approximate MCX charges
            break;
    }

    // SEBI Charges
    const sebiCharges = turnover * TAX_RATES.SEBI;

    // Brokerage
    const brokerage = brokeragePerOrder * numberOfOrders;

    // GST (18% on brokerage + exchange + SEBI)
    const gst = (brokerage + exchangeCharges + sebiCharges) * TAX_RATES.GST;

    // Stamp Duty
    const stampDutyRate = TAX_RATES.STAMP_DUTY[state] || TAX_RATES.STAMP_DUTY['Other'];
    const stampDuty = buyValue * stampDutyRate;

    // Total charges
    const totalCharges = stt + exchangeCharges + gst + stampDuty + sebiCharges + brokerage;

    return {
        stt: Math.round(stt * 100) / 100,
        exchangeCharges: Math.round(exchangeCharges * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        stampDuty: Math.round(stampDuty * 100) / 100,
        sebiCharges: Math.round(sebiCharges * 100) / 100,
        brokerage: Math.round(brokerage * 100) / 100,
        totalCharges: Math.round(totalCharges * 100) / 100,
    };
}

/**
 * Calculate Net P&L after all charges
 */
export function calculateNetPnL(grossPnL: number, charges: TradeCharges): number {
    return Math.round((grossPnL - charges.totalCharges) * 100) / 100;
}

/**
 * Calculate turnover from trade details
 */
export function calculateTurnover(
    entryPrice: number,
    exitPrice: number,
    quantity: number,
    lotSize: number = 1
): { buyValue: number; sellValue: number; turnover: number } {
    const totalQuantity = quantity * lotSize;
    const buyValue = entryPrice * totalQuantity;
    const sellValue = exitPrice * totalQuantity;
    const turnover = buyValue + sellValue;

    return { buyValue, sellValue, turnover };
}

/**
 * Calculate Gross P&L from trade details
 */
export function calculateGrossPnL(
    entryPrice: number,
    exitPrice: number,
    quantity: number,
    lotSize: number = 1,
    tradeType: 'BUY' | 'SELL'
): number {
    const totalQuantity = quantity * lotSize;

    if (tradeType === 'BUY') {
        // Bought first, sold later
        return (exitPrice - entryPrice) * totalQuantity;
    } else {
        // Sold first (short), bought later
        return (entryPrice - exitPrice) * totalQuantity;
    }
}

/**
 * Format currency in Indian format
 */
export function formatINR(amount: number): string {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(amount);
}

/**
 * Format large numbers in Indian format (lakhs, crores)
 */
export function formatIndianNumber(num: number): string {
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (absNum >= 10000000) {
        return sign + (absNum / 10000000).toFixed(2) + ' Cr';
    } else if (absNum >= 100000) {
        return sign + (absNum / 100000).toFixed(2) + ' L';
    } else if (absNum >= 1000) {
        return sign + (absNum / 1000).toFixed(2) + ' K';
    }

    return sign + absNum.toFixed(2);
}
