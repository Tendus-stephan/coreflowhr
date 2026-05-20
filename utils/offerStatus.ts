/**
 * Pure offer-status label utilities — extracted so they can be unit-tested
 * and reused across OfferCard, Offers page, and offer-related emails.
 */

export type OfferStatus =
  | 'draft'
  | 'pending_approval'
  | 'awaiting_response'
  | 'awaiting_signature'
  | 'accepted'
  | 'declined'
  | 'signed'
  | 'negotiating';

export interface OfferLike {
  status: OfferStatus;
  requires_approval?: boolean;
  expiresAt?: string | null;
  archived?: boolean;
}

const NON_EXPIRABLE: OfferStatus[] = ['draft', 'pending_approval', 'accepted', 'declined', 'signed'];

export function isOfferExpired(offer: OfferLike): boolean {
  if (NON_EXPIRABLE.includes(offer.status)) return false;
  if (!offer.expiresAt) return false;
  return new Date(offer.expiresAt) < new Date();
}

/**
 * Returns the human-readable status label for an offer.
 * Throws if offer is null/undefined — callers must guard.
 */
export function getOfferStatusLabel(offer: OfferLike): string {
  if (offer == null) throw new Error('getOfferStatusLabel: offer must not be null or undefined');

  if (offer.archived) return 'Archived';
  if (isOfferExpired(offer)) return 'Expired';

  switch (offer.status) {
    case 'draft':               return 'Draft';
    case 'pending_approval':    return 'Awaiting approval';
    case 'awaiting_response':   return 'Awaiting response';
    case 'awaiting_signature':  return 'Awaiting signature';
    case 'accepted':            return 'Accepted';
    case 'declined':            return 'Declined';
    case 'signed':              return 'Signed';
    case 'negotiating':         return 'Negotiating';
    default:
      return 'Unknown';
  }
}
