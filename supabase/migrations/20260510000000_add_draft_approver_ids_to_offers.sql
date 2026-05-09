-- Store selected approver user IDs on the offer when saving as draft
-- (before submitForApproval creates the actual offer_approval_requests rows).
-- This lets the modal restore the selection when the user reopens a draft.

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS draft_approver_ids uuid[] DEFAULT NULL;
