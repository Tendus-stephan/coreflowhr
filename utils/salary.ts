/**
 * Salary formatting utilities.
 */

export type SalaryCurrency = 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD';
export type SalaryPeriod = 'per year' | 'per month' | 'per day' | 'per hour';

const CURRENCY_SYMBOLS: Record<SalaryCurrency, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'CA$',
  AUD: 'A$',
};

/**
 * Format a salary amount into a human-readable string.
 * Rounds to the nearest whole number before formatting.
 *
 * @throws if amount is null or undefined
 */
export function formatSalary(
  amount: number,
  currency: SalaryCurrency = 'USD',
  period: SalaryPeriod = 'per year'
): string {
  if (amount == null) throw new Error('formatSalary: amount must not be null or undefined');

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('en-US');
  return `${symbol}${formatted} ${period}`;
}
