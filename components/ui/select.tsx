import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error('Select components must be used within <Select>');
  return ctx;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value = '', onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onValueChange: onValueChange ?? (() => {}), open, setOpen }}>
      <div ref={ref} className="relative inline-block">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label'?: string;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelectContext();
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center justify-between gap-1 border border-gray-200 bg-white text-xs text-gray-700 rounded-lg px-2.5 py-1.5 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-colors',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown size={12} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelectContext();
  return <span>{value || placeholder}</span>;
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end';
}

export function SelectContent({ className, children, align = 'start' }: SelectContentProps) {
  const { open } = useSelectContext();
  if (!open) return null;
  return (
    <div
      className={cn(
        'absolute z-50 mt-1 min-w-[8rem] bg-white border border-gray-100 rounded-xl shadow-xl py-1',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
    >
      {children}
    </div>
  );
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function SelectItem({ value, className, children, ...props }: SelectItemProps) {
  const { value: selected, onValueChange, setOpen } = useSelectContext();
  return (
    <div
      role="option"
      aria-selected={selected === value}
      onClick={() => { onValueChange(value); setOpen(false); }}
      className={cn(
        'px-3 py-2 text-xs cursor-pointer transition-colors hover:bg-gray-50',
        selected === value ? 'text-gray-900 font-semibold' : 'text-gray-600',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
