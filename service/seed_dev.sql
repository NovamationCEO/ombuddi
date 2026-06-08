-- Development seed: one organization + one ombuds row matching the hard-coded
-- IDs that the frontend currently uses. Apply this *after* schema.sql.
--
-- Run from the service/ directory after a wipe:
--   set -a; source .env; set +a
--   docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < seed_dev.sql
--
-- Idempotent: ON CONFLICT DO NOTHING. Safe to re-run.
--
-- Once Phase 4 (Keycloak) lands and useUserId.ts is replaced with token-derived
-- identity, this file can be retired or replaced with per-developer seeds.

INSERT INTO organizations (id, name)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dev University')
ON CONFLICT (id) DO NOTHING;

-- The ombuds id must match web/src/tools/useUserId.ts.
INSERT INTO ombuds (id, organization_id, name)
VALUES (
    'b73d0105-af49-484f-87a3-217af3feff90',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Dev Ombuds'
)
ON CONFLICT (id) DO NOTHING;

-- Default picklists so AddEntry has medium and priority options available
-- out of the box. These are org-customizable in the UI under Organization →
-- Entry Mediums / Entry Priorities; this seed just makes the dev experience
-- usable without manually clicking through admin first.
INSERT INTO picklists (organization_id, kind, name, index, soft_delete) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',   'In Person',       0, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',   'Phone',           1, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',   'Videoconference', 2, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',   'Email',           3, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',   'Other',           4, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'priority', 'Primary',         0, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'priority', 'Secondary',       1, FALSE)
ON CONFLICT (organization_id, kind, name) WHERE soft_delete = FALSE DO NOTHING;
