import { describe, it, expect } from 'vitest';
import { getOfferStatusLabel, type OfferLike } from '../../utils/offerStatus';

const offer = (overrides: Partial<OfferLike> = {}): OfferLike => ({
  status: 'draft',
  requires_approval: false,
  archived: false,
  expiresAt: null,
  ...overrides,
});

describe('getOfferStatusLabel', () => {
  it('pending_approval → "Awaiting approval"', () => {
    expect(getOfferStatusLabel(offer({ status: 'pending_approval' }))).toBe('Awaiting approval');
  });

  it('awaiting_response → "Awaiting response"', () => {
    expect(getOfferStatusLabel(offer({ status: 'awaiting_response' }))).toBe('Awaiting response');
  });

  it('accepted → "Accepted"', () => {
    expect(getOfferStatusLabel(offer({ status: 'accepted' }))).toBe('Accepted');
  });

  it('declined → "Declined"', () => {
    expect(getOfferStatusLabel(offer({ status: 'declined' }))).toBe('Declined');
  });

  it('signed → "Signed"', () => {
    expect(getOfferStatusLabel(offer({ status: 'signed' }))).toBe('Signed');
  });

  it('draft → "Draft"', () => {
    expect(getOfferStatusLabel(offer({ status: 'draft' }))).toBe('Draft');
  });

  it('awaiting_signature → "Awaiting signature"', () => {
    expect(getOfferStatusLabel(offer({ status: 'awaiting_signature' }))).toBe('Awaiting signature');
  });

  it('archived offer → "Archived" regardless of status', () => {
    expect(getOfferStatusLabel(offer({ status: 'accepted', archived: true }))).toBe('Archived');
  });

  it('expired offer (past expiresAt, expirable status) → "Expired"', () => {
    expect(
      getOfferStatusLabel(offer({ status: 'awaiting_response', expiresAt: '2020-01-01T00:00:00Z' }))
    ).toBe('Expired');
  });

  it('non-expirable status (accepted) ignores past expiresAt', () => {
    expect(
      getOfferStatusLabel(offer({ status: 'accepted', expiresAt: '2020-01-01T00:00:00Z' }))
    ).toBe('Accepted');
  });

  it('unknown status falls through to "Unknown"', () => {
    // @ts-expect-error intentional bad status
    expect(getOfferStatusLabel(offer({ status: 'something_new' }))).toBe('Unknown');
  });

  it('null offer throws a descriptive error', () => {
    // @ts-expect-error intentional null
    expect(() => getOfferStatusLabel(null)).toThrow(/null or undefined/i);
  });

  it('undefined offer throws a descriptive error', () => {
    // @ts-expect-error intentional undefined
    expect(() => getOfferStatusLabel(undefined)).toThrow(/null or undefined/i);
  });
});
