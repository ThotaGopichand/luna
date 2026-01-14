'use client';

import { ReactNode, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: ReactNode;
    children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            icon,
            children,
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles = `
      inline-flex items-center justify-center gap-2 font-medium
      rounded-lg transition-all duration-200 cursor-pointer
      disabled:opacity-50 disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
    `;

        const variants = {
            primary: `
        bg-primary text-foreground hover:bg-primary-hover
        focus:ring-primary-light
      `,
            secondary: `
        bg-background-tertiary text-foreground hover:bg-border
        focus:ring-border-light
      `,
            danger: `
        bg-danger text-foreground hover:bg-danger-light
        focus:ring-danger
      `,
            ghost: `
        bg-transparent text-foreground-muted hover:bg-background-tertiary hover:text-foreground
        focus:ring-border
      `,
            outline: `
        bg-transparent border border-border text-foreground
        hover:bg-background-tertiary hover:border-border-light
        focus:ring-border
      `,
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2.5 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : icon ? (
                    <span className="w-4 h-4">{icon}</span>
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
