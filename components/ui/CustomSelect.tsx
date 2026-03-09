import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  required?: boolean;
}

export const CustomSelect: React.FC<Props> = ({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  disabled = false,
  leftIcon,
  required,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? '';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Base classes matching existing select styling
  const triggerBase =
    'w-full flex items-center justify-between gap-2 bg-white border border-gray-200 text-sm text-left transition-colors focus:outline-none';
  const openClass = open ? 'border-black ring-1 ring-black' : 'hover:border-gray-300';
  const disabledClass = disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'cursor-pointer';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`${triggerBase} ${openClass} ${disabledClass} ${className}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {leftIcon && <span className="text-gray-400 flex-shrink-0">{leftIcon}</span>}
          <span className={`truncate ${!value && placeholder ? 'text-gray-400' : ''}`}>
            {selectedLabel || placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto max-h-52 py-1"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`px-4 py-2.5 text-sm cursor-pointer select-none truncate
                  ${opt.disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700'}
                  ${isSelected ? 'bg-gray-100 font-medium text-gray-900' : 'hover:bg-gray-50'}
                `}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}

      {/* Hidden input for form required validation */}
      {required && <input tabIndex={-1} required value={value} onChange={() => {}} className="sr-only" aria-hidden />}
    </div>
  );
};
