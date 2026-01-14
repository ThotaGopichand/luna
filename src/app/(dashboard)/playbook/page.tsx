'use client';

import { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, BookOpen, Target,
    CheckCircle, XCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, Input, Modal, ModalActions } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getPlaybookRules, createPlaybookRule, updatePlaybookRule, deletePlaybookRule } from '@/lib/firestore';
import { PlaybookRule, STRATEGY_OPTIONS } from '@/types';

export default function PlaybookPage() {
    const { user } = useAuth();
    const [rules, setRules] = useState<PlaybookRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState<PlaybookRule | null>(null);
    const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

    // Form state
    const [strategyName, setStrategyName] = useState('');
    const [description, setDescription] = useState('');
    const [rulesList, setRulesList] = useState<string[]>(['']);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) loadRules();
    }, [user]);

    const loadRules = async () => {
        if (!user) return;
        try {
            const ruleDocs = await getPlaybookRules(user.uid);
            setRules(ruleDocs);
        } catch (error) {
            console.error('Error loading playbook rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (rule?: PlaybookRule) => {
        if (rule) {
            setEditingRule(rule);
            setStrategyName(rule.strategyName);
            setDescription(rule.description);
            setRulesList(rule.rules.length > 0 ? rule.rules : ['']);
        } else {
            setEditingRule(null);
            setStrategyName('');
            setDescription('');
            setRulesList(['']);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingRule(null);
        setStrategyName('');
        setDescription('');
        setRulesList(['']);
    };

    const addRule = () => {
        setRulesList([...rulesList, '']);
    };

    const updateRule = (index: number, value: string) => {
        const updated = [...rulesList];
        updated[index] = value;
        setRulesList(updated);
    };

    const removeRule = (index: number) => {
        if (rulesList.length === 1) return;
        setRulesList(rulesList.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!user || !strategyName) return;

        const filteredRules = rulesList.filter((r) => r.trim() !== '');
        if (filteredRules.length === 0) {
            alert('Please add at least one rule');
            return;
        }

        setSaving(true);
        try {
            if (editingRule) {
                await updatePlaybookRule(user.uid, editingRule.id, {
                    strategyName,
                    description,
                    rules: filteredRules,
                });
            } else {
                await createPlaybookRule(user.uid, {
                    userId: user.uid,
                    strategyName,
                    description,
                    rules: filteredRules,
                    linkedTrades: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
            await loadRules();
            closeModal();
        } catch (error) {
            console.error('Error saving rule:', error);
            alert('Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (ruleId: string) => {
        if (!user) return;
        if (!confirm('Are you sure you want to delete this playbook rule?')) return;

        try {
            await deletePlaybookRule(user.uid, ruleId);
            setRules((prev) => prev.filter((r) => r.id !== ruleId));
        } catch (error) {
            console.error('Error deleting rule:', error);
            alert('Failed to delete rule');
        }
    };

    const toggleExpand = (ruleId: string) => {
        setExpandedRules((prev) => {
            const next = new Set(prev);
            if (next.has(ruleId)) {
                next.delete(ruleId);
            } else {
                next.add(ruleId);
            }
            return next;
        });
    };

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
                title="Playbook"
                subtitle="Define and follow your trading rules"
                actions={
                    <Button onClick={() => openModal()}>
                        <Plus className="w-4 h-4" />
                        New Strategy
                    </Button>
                }
            />

            <div className="p-6 space-y-6">
                {/* Info Card */}
                <Card className="bg-accent/5 border-accent/20">
                    <div className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-foreground">Trading Playbook</p>
                            <p className="text-sm text-foreground-muted mt-1">
                                Document your trading strategies and rules here. When logging trades, you can link them to specific playbook rules to track adherence and improve discipline.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Rules List */}
                {rules.length === 0 ? (
                    <div className="text-center py-12">
                        <Target className="w-12 h-12 mx-auto mb-4 text-foreground-subtle" />
                        <p className="text-foreground-muted">No playbook rules yet</p>
                        <Button variant="outline" className="mt-4" onClick={() => openModal()}>
                            <Plus className="w-4 h-4" />
                            Create Your First Strategy
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {rules.map((rule) => {
                            const isExpanded = expandedRules.has(rule.id);
                            return (
                                <Card key={rule.id}>
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleExpand(rule.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Target className="w-5 h-5 text-primary-light" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground">{rule.strategyName}</h3>
                                                <p className="text-sm text-foreground-muted">
                                                    {rule.rules.length} rules • {rule.linkedTrades.length} linked trades
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal(rule);
                                                }}
                                                className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(rule.id);
                                                }}
                                                className="p-2 text-foreground-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-foreground-muted" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-foreground-muted" />
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                                            {rule.description && (
                                                <p className="text-sm text-foreground-muted mb-4">{rule.description}</p>
                                            )}
                                            <div className="space-y-2">
                                                {rule.rules.map((r, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-start gap-3 p-3 bg-background-tertiary rounded-lg"
                                                    >
                                                        <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-medium flex items-center justify-center flex-shrink-0">
                                                            {index + 1}
                                                        </span>
                                                        <p className="text-sm text-foreground">{r}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingRule ? 'Edit Strategy' : 'New Strategy'}
                size="lg"
            >
                <div className="space-y-4">
                    <Input
                        label="Strategy Name"
                        value={strategyName}
                        onChange={(e) => setStrategyName(e.target.value)}
                        placeholder="e.g., Gap Up Reversal"
                    />

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this strategy..."
                            className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                            rows={2}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-foreground">Rules</label>
                            <button
                                onClick={addRule}
                                className="text-sm text-accent hover:text-accent-hover"
                            >
                                + Add Rule
                            </button>
                        </div>
                        <div className="space-y-2">
                            {rulesList.map((rule, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-background-tertiary text-foreground-muted text-xs font-medium flex items-center justify-center flex-shrink-0">
                                        {index + 1}
                                    </span>
                                    <input
                                        type="text"
                                        value={rule}
                                        onChange={(e) => updateRule(index, e.target.value)}
                                        placeholder={`Rule ${index + 1}...`}
                                        className="flex-1 px-4 py-2 bg-background-tertiary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-accent"
                                    />
                                    {rulesList.length > 1 && (
                                        <button
                                            onClick={() => removeRule(index)}
                                            className="p-2 text-foreground-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <ModalActions>
                    <Button variant="ghost" onClick={closeModal}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={saving} disabled={!strategyName}>
                        <Save className="w-4 h-4" />
                        {editingRule ? 'Update' : 'Create'} Strategy
                    </Button>
                </ModalActions>
            </Modal>
        </div>
    );
}
