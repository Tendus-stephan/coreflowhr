import { describe, it, expect } from 'vitest';
import { formatSalary } from '../../utils/salary';

describe('formatSalary', () => {
  it('formats 64999.97 → "$65,000 per year" (rounds to nearest)', () => {
    expect(formatSalary(64999.97)).toBe('$65,000 per year');
  });

  it('formats exact 65000 → "$65,000 per year"', () => {
    expect(formatSalary(65000)).toBe('$65,000 per year');
  });

  it('formats 65000.50 → "$65,001 per year" (rounds up from .5)', () => {
    expect(formatSalary(65000.5)).toBe('$65,001 per year');
  });

  it('formats 0 → "$0 per year"', () => {
    expect(formatSalary(0)).toBe('$0 per year');
  });

  it('GBP uses £ symbol', () => {
    expect(formatSalary(65000, 'GBP')).toBe('£65,000 per year');
  });

  it('EUR uses € symbol', () => {
    expect(formatSalary(65000, 'EUR')).toBe('€65,000 per year');
  });

  it('per month period renders correctly', () => {
    expect(formatSalary(65000, 'USD', 'per month')).toBe('$65,000 per month');
  });

  it('per hour period renders correctly', () => {
    expect(formatSalary(75, 'USD', 'per hour')).toBe('$75 per hour');
  });

  it('null amount throws a descriptive error', () => {
    // @ts-expect-error intentional null
    expect(() => formatSalary(null)).toThrow(/null or undefined/i);
  });

  it('undefined amount throws a descriptive error', () => {
    // @ts-expect-error intentional undefined
    expect(() => formatSalary(undefined)).toThrow(/null or undefined/i);
  });

  it('large number includes comma separators', () => {
    expect(formatSalary(1_500_000)).toBe('$1,500,000 per year');
  });
});
