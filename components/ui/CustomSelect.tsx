import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  /** When true: white background, border, full-width form field style */
  inputStyle?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  className = '',
  leftIcon,
  disabled = false,
  inputStyle = false,
}) => {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const updatePosition = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    // Flip up if not enough space below
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(options.length * 36 + 8, 240);
    const top = spaceBelow < estimatedHeight && rect.top > estimatedHeight
      ? rect.top - estimatedHeight - 4
      : rect.bottom + 4;
    setDropdownStyle({
      position: 'fixed',
      top,
      left: rect.left,
      minWidth: rect.width,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleScroll = () => { if (open) updatePosition(); };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const buttonBase = inputStyle
    ? `inline-flex w-full items-center gap-2 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${className}`
    : `inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

  const emptyLabel = !selected ? (inputStyle ? 'text-gray-400' : 'text-gray-500') : '';

  return (
    <div ref={ref} className={`relative ${inputStyle ? 'block' : 'inline-block'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={buttonBase}
      >
        {leftIcon && <span className="text-gray-500">{leftIcon}</span>}
        <span className={`flex-1 text-left truncate ${emptyLabel}`}>
          {selected?.label ?? value}
        </span>
        <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
      </button>

      {open && createPortal(
        <div
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                opt.value === value
                  ? 'font-semibold text-gray-900 bg-gray-50'
                  : opt.value === ''
                  ? 'text-gray-400'
                  : 'text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
