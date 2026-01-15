'use client';

import { ReactNode } from 'react';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pb-0">
            <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && (
                    <p className="text-foreground-muted mt-1">{subtitle}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
