/**
 * DEV-ONLY: Toast & Confirm tester panel.
 * Renders bottom-left only in development mode.
 * Import and drop into App.tsx temporarily to test dialogs.
 *
 * Usage in App.tsx (inside ToastProvider + ConfirmProvider):
 *   import { DevToastTester } from './components/DevToastTester';
 *   <DevToastTester />
 */
import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

export const DevToastTester: React.FC = () => {
  if (!import.meta.env.DEV) return null;

  const toast = useToast();
  const confirm = useConfirm();
  const [lastResult, setLastResult] = useState<string>('');

  const btn = (label: string, onClick: () => void, color = 'bg-gray-800') =>
    <button
      onClick={onClick}
      className={`${color} text-white text-xs px-2.5 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity`}
    >{label}</button>;

  return (
    <div className="fixed bottom-5 left-5 z-[400] bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-64 space-y-3">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dev · Toast/Confirm tester</p>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-600">Toasts</p>
        <div className="flex flex-wrap gap-1.5">
          {btn('✓ Success', () => toast.success('Operation completed successfully!'), 'bg-green-600')}
          {btn('✕ Error', () => toast.error('Something went wrong. Please try again.'), 'bg-red-600')}
          {btn('ℹ Info', () => toast.info('Candidate sourcing started in the background.'), 'bg-blue-600')}
          {btn('Stack ×3', () => {
            toast.success('First toast');
            setTimeout(() => toast.error('Second toast — error'), 300);
            setTimeout(() => toast.info('Third toast — info'), 600);
          }, 'bg-gray-600')}
          {btn('Long msg', () => toast.error('Your plan allows up to 50 candidates per export. Please select fewer candidates or upgrade to Professional.'), 'bg-red-800')}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-600">Confirm dialogs</p>
        <div className="flex flex-wrap gap-1.5">
          {btn('Default', async () => {
            const ok = await confirm({ title: 'Confirm action?', description: 'This will do something important.', confirmLabel: 'Yes, do it' });
            setLastResult(ok ? '✓ Confirmed' : '✕ Cancelled');
          })}
          {btn('Destructive', async () => {
            const ok = await confirm({ title: 'Delete job?', description: 'This cannot be undone and removes all candidates.', confirmLabel: 'Delete', variant: 'destructive' });
            setLastResult(ok ? '✓ Confirmed' : '✕ Cancelled');
          }, 'bg-red-600')}
          {btn('No desc', async () => {
            const ok = await confirm({ title: 'Are you sure?', confirmLabel: 'Yes' });
            setLastResult(ok ? '✓ Confirmed' : '✕ Cancelled');
          }, 'bg-gray-500')}
        </div>
        {lastResult && (
          <p className={`text-xs font-bold ${lastResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
            Last result: {lastResult}
          </p>
        )}
      </div>
    </div>
  );
};
