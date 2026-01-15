'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, Search, Filter, Plus, FileText, Image, Calendar,
    Clock, Share2, Download, Trash2, Tag, AlertTriangle, Wifi, WifiOff,
    MoreVertical, X
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

import { Button, Card, Input, Modal, ModalActions, Badge } from '@/components/ui';
import { Tag as TagComponent } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { getDocuments, createDocument, deleteDocument, updateDocument, getExpiringDocuments } from '@/lib/firestore';
import { uploadFile, deleteFile, validateFile } from '@/lib/storage';
import { Document, DEFAULT_TAGS } from '@/types';
import SecureShareModal from '@/components/vault/SecureShareModal';

export default function VaultPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [expiringDocs, setExpiringDocs] = useState<Document[]>([]);

    // Upload state
    const [uploadFile_, setUploadFile_] = useState<File | null>(null);
    const [uploadTags, setUploadTags] = useState<string[]>([]);
    const [uploadExpiry, setUploadExpiry] = useState('');

    useEffect(() => {
        if (user) {
            loadDocuments();
            loadExpiringDocs();
        }
    }, [user]);

    useEffect(() => {
        filterDocuments();
    }, [documents, searchQuery, selectedTags]);

    const loadDocuments = async () => {
        if (!user) return;
        try {
            const docs = await getDocuments(user.uid);
            setDocuments(docs);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadExpiringDocs = async () => {
        if (!user) return;
        try {
            const docs = await getExpiringDocuments(user.uid, 30);
            setExpiringDocs(docs);
        } catch (error) {
            console.error('Error loading expiring docs:', error);
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

        if (selectedTags.length > 0) {
            filtered = filtered.filter((doc) =>
                selectedTags.some((tag) => doc.tags.includes(tag))
            );
        }

        setFilteredDocs(filtered);
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const validation = validateFile(file);
            if (validation.valid) {
                setUploadFile_(file);
                setShowUploadModal(true);
            } else {
                alert(validation.error);
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
        },
        maxFiles: 1,
    });

    const handleUpload = async () => {
        if (!user || !uploadFile_) return;

        setUploading(true);
        try {
            const result = await uploadFile(user.uid, uploadFile_, 'documents');

            await createDocument(user.uid, {
                userId: user.uid,
                fileName: uploadFile_.name,
                fileType: uploadFile_.type.includes('pdf') ? 'pdf' : uploadFile_.type.includes('png') ? 'png' : 'jpg',
                fileUrl: result.url,
                storageRef: result.ref,
                tags: uploadTags,
                expiryDate: uploadExpiry ? new Date(uploadExpiry).getTime() : null,
                isOfflineAvailable: false,
                uploadedAt: Date.now(),
                updatedAt: Date.now(),
            });

            await loadDocuments();
            resetUploadForm();
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(error.message || 'Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const resetUploadForm = () => {
        setShowUploadModal(false);
        setUploadFile_(null);
        setUploadTags([]);
        setUploadExpiry('');
    };

    const handleDelete = async (doc: Document) => {
        if (!user) return;
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            await deleteFile(doc.storageRef);
            await deleteDocument(user.uid, doc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete document');
        }
    };

    const toggleOffline = async (doc: Document) => {
        if (!user) return;
        try {
            await updateDocument(user.uid, doc.id, {
                isOfflineAvailable: !doc.isOfflineAvailable,
            });
            setDocuments((prev) =>
                prev.map((d) =>
                    d.id === doc.id ? { ...d, isOfflineAvailable: !d.isOfflineAvailable } : d
                )
            );
        } catch (error) {
            console.error('Error updating offline status:', error);
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
        <div className="min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pb-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Document Vault</h1>
                    <p className="text-foreground-muted">{documents.length} documents stored securely</p>
                </div>
                <Button onClick={() => setShowUploadModal(true)}>
                    <Plus className="w-4 h-4" />
                    Upload
                </Button>
            </div>

            <div className="p-6 space-y-6">
                {/* Expiry Alerts */}
                {expiringDocs.length > 0 && (
                    <Card className="bg-warning/5 border-warning/20">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-warning" />
                            <div>
                                <p className="text-foreground font-medium">
                                    {expiringDocs.length} document{expiringDocs.length > 1 ? 's' : ''} expiring soon
                                </p>
                                <p className="text-sm text-foreground-muted">
                                    {expiringDocs.map((d) => d.fileName).join(', ')}
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {DEFAULT_TAGS.map((tag) => (
                            <TagComponent
                                key={tag.name}
                                name={tag.name}
                                color={tag.color}
                                selected={selectedTags.includes(tag.name)}
                                onClick={() => {
                                    setSelectedTags((prev) =>
                                        prev.includes(tag.name)
                                            ? prev.filter((t) => t !== tag.name)
                                            : [...prev, tag.name]
                                    );
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    {...getRootProps()}
                    className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive
                            ? 'border-accent bg-accent/5'
                            : 'border-border hover:border-border-light hover:bg-background-secondary'
                        }
          `}
                >
                    <input {...getInputProps()} />
                    <Upload className="w-10 h-10 mx-auto mb-4 text-foreground-muted" />
                    <p className="text-foreground font-medium">
                        {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                    </p>
                    <p className="text-foreground-muted text-sm mt-1">
                        or click to browse (PDF, JPG, PNG - max 10MB)
                    </p>
                </div>

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
                                        <button
                                            onClick={() => window.open(doc.fileUrl, '_blank')}
                                            className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedDoc(doc);
                                                setShowShareModal(true);
                                            }}
                                            className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                                            title="Share"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleOffline(doc)}
                                            className={`p-2 rounded-lg transition-colors ${doc.isOfflineAvailable
                                                ? 'text-success bg-success/10'
                                                : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
                                                }`}
                                            title={doc.isOfflineAvailable ? 'Available offline' : 'Make available offline'}
                                        >
                                            {doc.isOfflineAvailable ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                        </button>
                                        <div className="flex-1" />
                                        <button
                                            onClick={() => handleDelete(doc)}
                                            className="p-2 text-foreground-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <Modal
                isOpen={showUploadModal}
                onClose={resetUploadForm}
                title="Upload Document"
                size="md"
            >
                <div className="space-y-4">
                    {uploadFile_ && (
                        <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg">
                            {getFileIcon(uploadFile_.type.includes('pdf') ? 'pdf' : 'image')}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{uploadFile_.name}</p>
                                <p className="text-xs text-foreground-muted">
                                    {(uploadFile_.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <button
                                onClick={() => setUploadFile_(null)}
                                className="p-1 hover:bg-background-secondary rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {DEFAULT_TAGS.map((tag) => (
                                <TagComponent
                                    key={tag.name}
                                    name={tag.name}
                                    color={tag.color}
                                    selected={uploadTags.includes(tag.name)}
                                    onClick={() => {
                                        setUploadTags((prev) =>
                                            prev.includes(tag.name)
                                                ? prev.filter((t) => t !== tag.name)
                                                : [...prev, tag.name]
                                        );
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <Input
                        label="Expiry Date (optional)"
                        type="date"
                        value={uploadExpiry}
                        onChange={(e) => setUploadExpiry(e.target.value)}
                        hint="For documents like Passport, License, Insurance"
                    />
                </div>

                <ModalActions>
                    <Button variant="ghost" onClick={resetUploadForm}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} loading={uploading} disabled={!uploadFile_}>
                        Upload
                    </Button>
                </ModalActions>
            </Modal>

            {/* Share Modal */}
            {selectedDoc && (
                <SecureShareModal
                    isOpen={showShareModal}
                    onClose={() => {
                        setShowShareModal(false);
                        setSelectedDoc(null);
                    }}
                    document={selectedDoc}
                />
            )}
        </div>
    );
}
