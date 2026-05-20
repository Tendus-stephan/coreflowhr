import { describe, it, expect } from 'vitest';
import { addMinutes, addDays } from 'date-fns';

/** Local midnight — avoids timezone-sensitive startOfDay from date-fns. */
function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Scheduling slot-generation and token-validation logic.
 * These are pure business-rule tests — no network calls.
 */

// ── Inline scheduling logic (mirrors future scheduling service) ───────────────

interface SchedulingConfig {
  availableHoursStart: number; // 0–23
  availableHoursEnd: number;   // 0–23
  slotDurationMinutes: number;
  bufferMinutes: number;
  includeWeekends: boolean;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  bookedSlots?: Date[]; // already-booked start times
}

function generateAvailableSlots(config: SchedulingConfig): Date[] {
  if (config.availableHoursStart >= config.availableHoursEnd) return [];
  if (config.dateRangeEnd < config.dateRangeStart) return [];

  const slots: Date[] = [];
  const step = config.slotDurationMinutes + config.bufferMinutes;
  const bookedMs = new Set((config.bookedSlots ?? []).map((d) => d.getTime()));

  let day = localMidnight(config.dateRangeStart);
  while (day <= config.dateRangeEnd) {
    const dow = day.getDay(); // 0=Sun, 6=Sat
    if (config.includeWeekends || (dow !== 0 && dow !== 6)) {
      let slotTime = new Date(day);
      slotTime.setHours(config.availableHoursStart, 0, 0, 0);

      const endOfSlots = new Date(day);
      endOfSlots.setHours(config.availableHoursEnd, 0, 0, 0);

      while (addMinutes(slotTime, config.slotDurationMinutes) <= endOfSlots) {
        if (!bookedMs.has(slotTime.getTime())) {
          slots.push(new Date(slotTime));
        }
        slotTime = addMinutes(slotTime, step);
      }
    }
    day = addDays(day, 1);
  }

  return slots;
}

interface SchedulingToken {
  token: string;
  expiresAt: string;
  bookedAt: string | null;
}

function validateSchedulingToken(token: SchedulingToken | null | undefined): void {
  if (token == null) throw new Error('Invalid scheduling link');
  if (!token.token) throw new Error('Invalid scheduling link');
  if (token.bookedAt) throw new Error('This slot has already been booked');
  if (new Date(token.expiresAt) < new Date()) throw new Error('This scheduling link has expired');
}

// ── generateAvailableSlots ────────────────────────────────────────────────────

describe('generateAvailableSlots', () => {
  // Use Date constructor (local time) to avoid ISO-string UTC-vs-local ambiguity
  const baseConfig: SchedulingConfig = {
    availableHoursStart: 9,
    availableHoursEnd: 17,
    slotDurationMinutes: 60,
    bufferMinutes: 0,
    includeWeekends: false,
    dateRangeStart: new Date(2025, 5, 2),  // Mon 2 Jun 2025 local midnight
    dateRangeEnd: new Date(2025, 5, 6),    // Fri 6 Jun 2025 local midnight
  };

  it('returns slots within available hours', () => {
    const slots = generateAvailableSlots(baseConfig);
    slots.forEach((s) => {
      expect(s.getHours()).toBeGreaterThanOrEqual(9);
      expect(s.getHours()).toBeLessThan(17);
    });
  });

  it('applies buffer time — slots separated by duration + buffer', () => {
    const config = { ...baseConfig, slotDurationMinutes: 30, bufferMinutes: 15 };
    const slots = generateAvailableSlots(config);
    if (slots.length >= 2) {
      const diff = (slots[1].getTime() - slots[0].getTime()) / 60_000;
      expect(diff).toBe(45); // 30 min slot + 15 min buffer
    }
  });

  it('excludes weekends when includeWeekends=false', () => {
    const config = {
      ...baseConfig,
      dateRangeStart: new Date(2025, 5, 7),  // Sat 7 Jun 2025
      dateRangeEnd: new Date(2025, 5, 8),    // Sun 8 Jun 2025
    };
    expect(generateAvailableSlots(config)).toHaveLength(0);
  });

  it('includes weekends when includeWeekends=true', () => {
    const config = {
      ...baseConfig,
      includeWeekends: true,
      dateRangeStart: new Date(2025, 5, 7),
      dateRangeEnd: new Date(2025, 5, 8),
    };
    expect(generateAvailableSlots(config).length).toBeGreaterThan(0);
  });

  it('returns empty array when dateRangeEnd is before dateRangeStart', () => {
    const reversed = {
      ...baseConfig,
      dateRangeStart: new Date(2025, 0, 10),
      dateRangeEnd: new Date(2025, 0, 5),
    };
    expect(generateAvailableSlots(reversed)).toHaveLength(0);
  });

  it('returns empty array when no hours configured (start >= end)', () => {
    const config = { ...baseConfig, availableHoursStart: 17, availableHoursEnd: 9 };
    expect(generateAvailableSlots(config)).toHaveLength(0);
  });

  it('correct number of slots for a single weekday with 1h slots, 8h window', () => {
    const monday = new Date(2025, 5, 2); // local midnight Mon 2 Jun
    const config = {
      ...baseConfig,
      dateRangeStart: monday,
      dateRangeEnd: monday,
    };
    // 9,10,11,12,13,14,15,16 = 8 slots
    expect(generateAvailableSlots(config)).toHaveLength(8);
  });
});

// ── validateSchedulingToken ───────────────────────────────────────────────────

describe('validateSchedulingToken', () => {
  const futureExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const pastExpiry = new Date(Date.now() - 1000).toISOString();

  it('valid token passes', () => {
    expect(() =>
      validateSchedulingToken({ token: 'tok_abc', expiresAt: futureExpiry, bookedAt: null })
    ).not.toThrow();
  });

  it('expired token throws "expired"', () => {
    expect(() =>
      validateSchedulingToken({ token: 'tok_abc', expiresAt: pastExpiry, bookedAt: null })
    ).toThrow(/expired/i);
  });

  it('already booked token throws "already been booked"', () => {
    expect(() =>
      validateSchedulingToken({ token: 'tok_abc', expiresAt: futureExpiry, bookedAt: new Date().toISOString() })
    ).toThrow(/already been booked/i);
  });

  it('invalid (empty) token throws', () => {
    expect(() =>
      validateSchedulingToken({ token: '', expiresAt: futureExpiry, bookedAt: null })
    ).toThrow(/invalid/i);
  });

  it('null token throws descriptive error', () => {
    expect(() => validateSchedulingToken(null)).toThrow(/invalid/i);
  });

  it('undefined token throws descriptive error', () => {
    expect(() => validateSchedulingToken(undefined)).toThrow(/invalid/i);
  });
});
