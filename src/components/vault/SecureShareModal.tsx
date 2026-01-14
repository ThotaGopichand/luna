'use client';

import { useState } from 'react';
import { Copy, Check, Clock, Eye, Link2, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/lib/auth';
import { createShareLink } from '@/lib/firestore';
import { Document, ShareLink, ShareAuditEntry } from '@/types';
import { Modal, ModalActions, Button } from '@/components/ui';

interface SecureShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: Document;
}

export default function SecureShareModal({
    isOpen,
    onClose,
    document,
}: SecureShareModalProps) {
    const { user } = useAuth();
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expiryMinutes, setExpiryMinutes] = useState(5);

    const generateShareLink = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const linkId = uuidv4();
            const now = Date.now();
            const expiresAt = now + expiryMinutes * 60 * 1000;

            const auditEntry: ShareAuditEntry = {
                action: 'created',
                timestamp: now,
            };

            const shareLink: Omit<ShareLink, 'id'> = {
                documentId: document.id,
                userId: user.uid,
                createdAt: now,
                expiresAt,
                viewCount: 0,
                maxViews: 1,
                isActive: true,
                auditLog: [auditEntry],
            };

            await createShareLink(user.uid, shareLink);

            // Generate the share URL
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const url = `${baseUrl}/api/share/${linkId}?uid=${user.uid}`;
            setShareUrl(url);
        } catch (error) {
            console.error('Error creating share link:', error);
            alert('Failed to create share link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const handleClose = () => {
        setShareUrl(null);
        setCopied(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Secure Share" size="md">
            <div className="space-y-4">
                {/* Warning */}
                <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-warning">Burn After Reading</p>
                        <p className="text-xs text-foreground-muted mt-1">
                            The generated link will self-destruct after <strong>{expiryMinutes} minutes</strong> or <strong>1 view</strong>, whichever comes first.
                        </p>
                    </div>
                </div>

                {/* Document info */}
                <div className="p-4 bg-background-tertiary rounded-lg">
                    <p className="text-sm font-medium text-foreground">{document.fileName}</p>
                    <p className="text-xs text-foreground-muted mt-1">
                        This document will be shared securely
                    </p>
                </div>

                {/* Expiry options */}
                {!shareUrl && (
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Link expires after
                        </label>
                        <div className="flex gap-2">
                            {[5, 10, 15, 30].map((mins) => (
                                <button
                                    key={mins}
                                    onClick={() => setExpiryMinutes(mins)}
                                    className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${expiryMinutes === mins
                                            ? 'bg-accent/20 text-accent border border-accent/50'
                                            : 'bg-background-tertiary text-foreground-muted hover:bg-border'
                                        }
                  `}
                                >
                                    <Clock className="w-4 h-4" />
                                    {mins} min
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Generated URL */}
                {shareUrl && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-background-tertiary rounded-lg">
                            <Link2 className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 bg-transparent text-sm text-foreground border-none outline-none"
                            />
                            <button
                                onClick={copyToClipboard}
                                className={`
                  p-2 rounded-lg transition-colors
                  ${copied
                                        ? 'bg-success/20 text-success'
                                        : 'hover:bg-background-secondary text-foreground-muted hover:text-foreground'
                                    }
                `}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-foreground-muted">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expires in {expiryMinutes} minutes
                            </span>
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                1 view allowed
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <ModalActions>
                <Button variant="ghost" onClick={handleClose}>
                    {shareUrl ? 'Close' : 'Cancel'}
                </Button>
                {!shareUrl && (
                    <Button onClick={generateShareLink} loading={loading}>
                        <Link2 className="w-4 h-4" />
                        Generate Link
                    </Button>
                )}
            </ModalActions>
        </Modal>
    );
}
