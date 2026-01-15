'use client';

import { useState } from 'react';
import {
    Shield, Bell, Palette, Calculator, LogOut, AlertTriangle,
    Save, Check, User, Mail, Key
} from 'lucide-react';

import { Button, Card, CardHeader, Input, Select } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { TAX_RATES } from '@/lib/tax-calculator';

export default function SettingsPage() {
    const { user, userProfile, userSettings, updateUserSettings, logoutAllDevices } = useAuth();

    const [brokerageRate, setBrokerageRate] = useState(userSettings?.brokerageRate?.toString() || '20');
    const [defaultState, setDefaultState] = useState(userSettings?.defaultStampDutyState || 'Maharashtra');
    const [notifications, setNotifications] = useState(userSettings?.notifications ?? true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateUserSettings({
                brokerageRate: parseFloat(brokerageRate) || 20,
                defaultStampDutyState: defaultState,
                notifications,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleKillSwitch = async () => {
        if (!confirm('This will log you out from ALL devices, including this one. Continue?')) return;

        setLoggingOut(true);
        try {
            await logoutAllDevices();
        } catch (error) {
            console.error('Error triggering kill switch:', error);
            alert('Failed to force logout all devices');
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pb-0 max-w-4xl mx-auto w-full">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-foreground-muted">Manage your preferences and security</p>
                </div>
            </div>

            <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* Profile Section */}
                <Card>
                    <CardHeader title="Profile" subtitle="Your account information" />

                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                                {userProfile?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-foreground">
                                {userProfile?.displayName || 'User'}
                            </p>
                            <p className="text-foreground-muted">{user?.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Display Name"
                            value={userProfile?.displayName || ''}
                            disabled
                            icon={<User className="w-4 h-4" />}
                        />
                        <Input
                            label="Email"
                            value={user?.email || ''}
                            disabled
                            icon={<Mail className="w-4 h-4" />}
                        />
                    </div>
                </Card>

                {/* Trading Settings */}
                <Card>
                    <CardHeader
                        title="Trading Calculator"
                        subtitle="Configure your tax calculation preferences"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Brokerage per Order (₹)"
                            type="number"
                            value={brokerageRate}
                            onChange={(e) => setBrokerageRate(e.target.value)}
                            icon={<Calculator className="w-4 h-4" />}
                            hint="Typical discount broker: ₹20/order"
                        />
                        <Select
                            label="Default State (Stamp Duty)"
                            options={Object.keys(TAX_RATES.STAMP_DUTY).map((state) => ({
                                value: state,
                                label: state,
                            }))}
                            value={defaultState}
                            onChange={(e) => setDefaultState(e.target.value)}
                        />
                    </div>

                    <div className="mt-4 p-4 bg-background-tertiary rounded-lg">
                        <p className="text-sm font-medium text-foreground mb-2">Current Tax Rates</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-foreground-muted">STT (Options)</p>
                                <p className="text-foreground">{(TAX_RATES.STT.OPTIONS_SELL * 100).toFixed(4)}%</p>
                            </div>
                            <div>
                                <p className="text-foreground-muted">Exchange</p>
                                <p className="text-foreground">{(TAX_RATES.EXCHANGE.NSE_OPTIONS * 100).toFixed(3)}%</p>
                            </div>
                            <div>
                                <p className="text-foreground-muted">GST</p>
                                <p className="text-foreground">{TAX_RATES.GST * 100}%</p>
                            </div>
                            <div>
                                <p className="text-foreground-muted">Stamp Duty</p>
                                <p className="text-foreground">{((TAX_RATES.STAMP_DUTY[defaultState] || 0.00015) * 100).toFixed(3)}%</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader
                        title="Notifications"
                        subtitle="Manage alert preferences"
                    />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-foreground-muted" />
                                <div>
                                    <p className="text-foreground font-medium">Document Expiry Alerts</p>
                                    <p className="text-sm text-foreground-muted">
                                        Get notified when documents are about to expire
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setNotifications(!notifications)}
                                className={`
                  relative w-12 h-6 rounded-full transition-colors
                  ${notifications ? 'bg-success' : 'bg-border'}
                `}
                            >
                                <div
                                    className={`
                    absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                    ${notifications ? 'left-7' : 'left-1'}
                  `}
                                />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Security */}
                <Card className="border-danger/20">
                    <CardHeader
                        title="Security"
                        subtitle="Manage your account security"
                    />

                    <div className="space-y-4">
                        {/* Kill Switch */}
                        <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-medium text-danger">Force Logout All Devices</p>
                                    <p className="text-sm text-foreground-muted mt-1">
                                        This will immediately log out all active sessions, including this device.
                                        Use this if you suspect your account has been compromised.
                                    </p>
                                    <Button
                                        variant="danger"
                                        className="mt-4"
                                        onClick={handleKillSwitch}
                                        loading={loggingOut}
                                    >
                                        <Shield className="w-4 h-4" />
                                        Trigger Kill Switch
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Session Info */}
                        <div className="p-4 bg-background-tertiary rounded-lg">
                            <div className="flex items-center gap-3">
                                <Key className="w-5 h-5 text-foreground-muted" />
                                <div>
                                    <p className="text-foreground font-medium">Current Session</p>
                                    <p className="text-sm text-foreground-muted">
                                        Last login: {user?.metadata?.lastSignInTime || 'Unknown'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button onClick={handleSave} loading={saving}>
                        {saved ? (
                            <>
                                <Check className="w-4 h-4" />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
