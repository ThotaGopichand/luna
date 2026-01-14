'use client';

import { useState } from 'react';
import { Copy, Check, Sparkles, ArrowRight, FileJson } from 'lucide-react';
import { Modal, ModalActions, Button } from '@/components/ui';

interface LunaProtocolProps {
    isOpen: boolean;
    onClose: () => void;
    onParsed: (data: ParsedTradeData) => void;
}

interface ParsedTradeData {
    symbol?: string;
    entryPrice?: number;
    exitPrice?: number;
    quantity?: number;
    type?: 'BUY' | 'SELL';
    instrument?: 'OPTIONS' | 'FUTURES' | 'EQUITY' | 'COMMODITIES';
}

const AI_PROMPT = `Extract the following trade details from this screenshot and return ONLY a JSON object (no markdown, no explanation):

{
  "symbol": "The trading symbol (e.g., NIFTY, BANKNIFTY, RELIANCE)",
  "entryPrice": The entry/buy price as a number,
  "exitPrice": The exit/sell price as a number,
  "quantity": The quantity/lots as a number,
  "type": "BUY" or "SELL" (the direction of the trade),
  "instrument": "OPTIONS" or "FUTURES" or "EQUITY"
}

If any field is unclear or not visible, omit it from the JSON. Return ONLY valid JSON.`;

export default function LunaProtocol({ isOpen, onClose, onParsed }: LunaProtocolProps) {
    const [step, setStep] = useState<'copy' | 'paste'>('copy');
    const [copied, setCopied] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const copyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(AI_PROMPT);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setStep('paste');
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const parseJson = () => {
        setError(null);

        try {
            // Clean up the input - remove markdown code blocks if present
            let cleanJson = jsonInput.trim();
            if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```/g, '');
            }

            const data = JSON.parse(cleanJson);

            // Validate and transform the data
            const parsed: ParsedTradeData = {};

            if (data.symbol && typeof data.symbol === 'string') {
                parsed.symbol = data.symbol.toUpperCase();
            }
            if (data.entryPrice && !isNaN(parseFloat(data.entryPrice))) {
                parsed.entryPrice = parseFloat(data.entryPrice);
            }
            if (data.exitPrice && !isNaN(parseFloat(data.exitPrice))) {
                parsed.exitPrice = parseFloat(data.exitPrice);
            }
            if (data.quantity && !isNaN(parseInt(data.quantity))) {
                parsed.quantity = parseInt(data.quantity);
            }
            if (data.type && ['BUY', 'SELL'].includes(data.type.toUpperCase())) {
                parsed.type = data.type.toUpperCase() as 'BUY' | 'SELL';
            }
            if (data.instrument && ['OPTIONS', 'FUTURES', 'EQUITY', 'COMMODITIES'].includes(data.instrument.toUpperCase())) {
                parsed.instrument = data.instrument.toUpperCase() as ParsedTradeData['instrument'];
            }

            if (Object.keys(parsed).length === 0) {
                throw new Error('No valid trade data found in the JSON');
            }

            onParsed(parsed);
            handleClose();
        } catch (err: any) {
            setError(err.message || 'Invalid JSON format. Please check the AI output.');
        }
    };

    const handleClose = () => {
        setStep('copy');
        setJsonInput('');
        setError(null);
        setCopied(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Luna Protocol" size="lg">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                    <Sparkles className="w-6 h-6 text-accent" />
                    <div>
                        <p className="font-medium text-foreground">AI-Assisted Trade Import</p>
                        <p className="text-sm text-foreground-muted">
                            Use Gemini or ChatGPT to extract trade details from screenshots
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${step === 'copy' ? 'text-accent' : 'text-foreground-muted'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'copy' ? 'bg-accent text-white' : 'bg-background-tertiary'}`}>
                            1
                        </div>
                        <span className="text-sm font-medium">Copy Prompt</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-foreground-subtle" />
                    <div className={`flex items-center gap-2 ${step === 'paste' ? 'text-accent' : 'text-foreground-muted'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'paste' ? 'bg-accent text-white' : 'bg-background-tertiary'}`}>
                            2
                        </div>
                        <span className="text-sm font-medium">Paste Result</span>
                    </div>
                </div>

                {step === 'copy' ? (
                    <>
                        {/* Prompt display */}
                        <div className="relative">
                            <pre className="p-4 bg-background-tertiary rounded-lg text-sm text-foreground-muted overflow-x-auto whitespace-pre-wrap">
                                {AI_PROMPT}
                            </pre>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2 text-sm text-foreground-muted">
                            <p><strong className="text-foreground">How to use:</strong></p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Copy the prompt below</li>
                                <li>Open Gemini or ChatGPT</li>
                                <li>Upload your trade screenshot and paste the prompt</li>
                                <li>Copy the JSON response and paste it in the next step</li>
                            </ol>
                        </div>
                    </>
                ) : (
                    <>
                        {/* JSON input */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Paste AI Response (JSON)
                            </label>
                            <textarea
                                value={jsonInput}
                                onChange={(e) => {
                                    setJsonInput(e.target.value);
                                    setError(null);
                                }}
                                placeholder='{"symbol": "NIFTY", "entryPrice": 100, "exitPrice": 110, ...}'
                                className="w-full h-40 px-4 py-3 bg-background-tertiary border border-border rounded-lg text-foreground text-sm font-mono resize-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                            />
                            {error && (
                                <p className="mt-2 text-sm text-danger">{error}</p>
                            )}
                        </div>

                        {/* Example */}
                        <div className="p-4 bg-background-tertiary rounded-lg">
                            <p className="text-xs text-foreground-subtle mb-2">Expected format:</p>
                            <code className="text-xs text-foreground-muted">
                                {`{"symbol": "NIFTY", "entryPrice": 150.50, "exitPrice": 165.00, "quantity": 50, "type": "BUY", "instrument": "OPTIONS"}`}
                            </code>
                        </div>
                    </>
                )}
            </div>

            <ModalActions>
                {step === 'copy' ? (
                    <>
                        <Button variant="ghost" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button onClick={copyPrompt}>
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy Prompt
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" onClick={() => setStep('copy')}>
                            Back
                        </Button>
                        <Button onClick={parseJson} disabled={!jsonInput.trim()}>
                            <FileJson className="w-4 h-4" />
                            Parse & Import
                        </Button>
                    </>
                )}
            </ModalActions>
        </Modal>
    );
}
