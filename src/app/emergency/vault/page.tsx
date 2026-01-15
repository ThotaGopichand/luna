'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, Image, Download, Search, Calendar, Lock, Check, X, AlertTriangle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

import { Button, Card, Input, Modal, ModalActions } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Document, DEFAULT_TAGS } from '@/types';
import { getDocuments } from '@/lib/firestore';

// Owner's UID - fetched from the main user document
const OWNER_UID = process.env.NEXT_PUBLIC_OWNER_UID || '';

export default function EmergencyVaultPage() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Download modal state
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [downloadPassword, setDownloadPassword] = useState('');
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        // Check if in emergency mode
        const token = sessionStorage.getItem('emergencyToken');
        if (!token) {
            router.push('/login');
            return;
        }

        loadDocuments();
    }, [router]);

    useEffect(() => {
        filterDocuments();
    }, [documents, searchQuery]);

    const loadDocuments = async () => {
        try {
            // In emergency mode, we need to fetch from the owner's documents
            // This requires a special API endpoint that validates the emergency token
            const token = sessionStorage.getItem('emergencyToken');

            const res = await fetch('/api/emergency/documents', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    sessionStorage.removeItem('emergencyToken');
                    sessionStorage.removeItem('emergencyMode');
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to load documents');
            }

            const data = await res.json();
            setDocuments(data.documents || []);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterDocuments = () => {
        let filtered = [...documents];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (doc) =>
                    doc.fileName.toLowerCase().includes(query) ||
                    doc.tags.some((tag) => tag.toLowerCase().includes(query))
            );
        }

        setFilteredDocs(filtered);
    };

    const handleDownloadClick = (doc: Document) => {
        setSelectedDoc(doc);
        setDownloadPassword('');
        setDownloadError(null);
        setShowDownloadModal(true);
    };

    const handleDownload = async () => {
        if (!selectedDoc || !downloadPassword) return;

        setVerifying(true);
        setDownloadError(null);

        try {
            const token = sessionStorage.getItem('emergencyToken');

            const res = await fetch('/api/auth/verify-download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    password: downloadPassword,
                    sessionToken: token,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setDownloadError(data.error || 'Invalid password');
                return;
            }

            // Password verified - trigger download
            window.open(selectedDoc.fileUrl, '_blank');
            setShowDownloadModal(false);
            setSelectedDoc(null);
            setDownloadPassword('');
        } catch (error) {
            console.error('Download verification error:', error);
            setDownloadError('Verification failed. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const getExpiryStatus = (expiryDate: number | null) => {
        if (!expiryDate) return null;
        const daysUntil = differenceInDays(expiryDate, Date.now());
        if (daysUntil < 0) return 'expired';
        if (daysUntil <= 7) return 'critical';
        if (daysUntil <= 30) return 'warning';
        return null;
    };

    const getFileIcon = (fileType: string) => {
        if (fileType === 'pdf') return <FileText className="w-5 h-5 text-danger" />;
        return <Image className="w-5 h-5 text-accent" />;
    };

    return (
        <div className="px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Document Vault</h1>
                    <p className="text-foreground-muted">{documents.length} documents available</p>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search className="w-4 h-4" />}
                />
            </div>

            {/* Emergency Mode Notice */}
            <Card className="bg-warning/10 border-warning/30 mb-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-foreground font-medium">Emergency Access Mode</p>
                        <p className="text-sm text-foreground-muted mt-1">
                            You have read-only access to view and download documents.
                            Downloads require the encryption password.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Documents Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="spinner" />
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-foreground-subtle" />
                    <p className="text-foreground-muted">No documents found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.map((doc) => {
                        const expiryStatus = getExpiryStatus(doc.expiryDate);
                        return (
                            <Card
                                key={doc.id}
                                hover
                                className={`
                                    ${expiryStatus === 'critical' ? 'expiry-critical' : ''}
                                    ${expiryStatus === 'warning' ? 'expiry-warning' : ''}
                                `}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-background-tertiary flex items-center justify-center">
                                        {getFileIcon(doc.fileType)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-foreground truncate">
                                            {doc.fileName}
                                        </h3>
                                        <p className="text-xs text-foreground-muted mt-1">
                                            Uploaded {format(doc.uploadedAt, 'MMM d, yyyy')}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {doc.tags.map((tag) => (
                                                <Badge key={tag} variant="primary" size="sm">
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {doc.expiryDate && (
                                    <div className={`
                                        flex items-center gap-2 mt-4 text-xs
                                        ${expiryStatus === 'critical' ? 'text-danger' : ''}
                                        ${expiryStatus === 'warning' ? 'text-warning' : 'text-foreground-muted'}
                                    `}>
                                        <Calendar className="w-3 h-3" />
                                        Expires {format(doc.expiryDate, 'MMM d, yyyy')}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadClick(doc)}
                                        className="flex-1"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Download
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Download Password Modal */}
            <Modal
                isOpen={showDownloadModal}
                onClose={() => {
                    setShowDownloadModal(false);
                    setSelectedDoc(null);
                    setDownloadPassword('');
                    setDownloadError(null);
                }}
                title="Enter Encryption Password"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-foreground-muted text-sm">
                        Enter the encryption password to download this document.
                    </p>

                    {selectedDoc && (
                        <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg">
                            {getFileIcon(selectedDoc.fileType)}
                            <span className="font-medium truncate">{selectedDoc.fileName}</span>
                        </div>
                    )}

                    {downloadError && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {downloadError}
                        </div>
                    )}

                    <Input
                        label="Encryption Password"
                        type="password"
                        value={downloadPassword}
                        onChange={(e) => setDownloadPassword(e.target.value)}
                        placeholder="Enter password"
                        icon={<Lock className="w-4 h-4" />}
                        onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                    />
                </div>

                <ModalActions>
                    <Button variant="ghost" onClick={() => setShowDownloadModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDownload}
                        loading={verifying}
                        disabled={!downloadPassword}
                    >
                        <Check className="w-4 h-4" />
                        Verify & Download
                    </Button>
                </ModalActions>
            </Modal>
        </div>
    );
}
