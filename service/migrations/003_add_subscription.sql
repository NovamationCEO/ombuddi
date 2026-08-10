-- Subscription tier and seat limit per organization.
-- Safe to run more than once.

BEGIN;

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'alpha',
    ADD COLUMN IF NOT EXISTS seat_limit        INT  NOT NULL DEFAULT 10;

COMMIT;
