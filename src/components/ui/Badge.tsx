'use client';

import { X } from 'lucide-react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
    size?: 'sm' | 'md';
    removable?: boolean;
    onRemove?: () => void;
}

export default function Badge({
    children,
    variant = 'default',
    size = 'md',
    removable = false,
    onRemove,
}: BadgeProps) {
    const variants = {
        default: 'bg-background-tertiary text-foreground-muted',
        primary: 'bg-primary/20 text-primary-light',
        success: 'bg-success/20 text-success',
        danger: 'bg-danger/20 text-danger',
        warning: 'bg-warning/20 text-warning',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
    };

    return (
        <span
            className={`
        inline-flex items-center gap-1 font-medium rounded-full
        ${variants[variant]} ${sizes[size]}
      `}
        >
            {children}
            {removable && (
                <button
                    onClick={onRemove}
                    className="ml-1 hover:bg-white/10 rounded-full p-0.5 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </span>
    );
}

interface TagProps {
    name: string;
    color?: string;
    selected?: boolean;
    onClick?: () => void;
    removable?: boolean;
    onRemove?: () => void;
}

export function Tag({
    name,
    color,
    selected = false,
    onClick,
    removable = false,
    onRemove,
}: TagProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium
        rounded-lg transition-all duration-200 cursor-pointer
        ${selected
                    ? 'bg-accent/20 text-accent border border-accent/50'
                    : 'bg-background-tertiary text-foreground-muted border border-transparent hover:border-border'
                }
      `}
            onClick={onClick}
        >
            {color && (
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                />
            )}
            #{name}
            {removable && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.();
                    }}
                    className="ml-1 hover:bg-white/10 rounded p-0.5 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </span>
    );
}
