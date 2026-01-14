'use client';

import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            hint,
            options,
            placeholder = 'Select an option',
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    className={`
            w-full px-4 py-2.5 bg-background-tertiary
            border rounded-lg text-foreground text-sm
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2
            focus:ring-offset-background focus:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none cursor-pointer
            ${error ? 'border-danger focus:ring-danger' : 'border-border focus:border-accent'}
            ${className}
          `}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25rem',
                    }}
                    {...props}
                >
                    <option value="" disabled>
                        {placeholder}
                    </option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="mt-1.5 text-xs text-danger">{error}</p>
                )}
                {hint && !error && (
                    <p className="mt-1.5 text-xs text-foreground-subtle">{hint}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
