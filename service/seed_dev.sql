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
INSERT INTO picklists (organization_id, kind, name, description, index, soft_delete) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',     'In Person',                              '',                  0, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',     'Phone',                                  '',                  1, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',     'Videoconference',                        '',                  2, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',     'Email',                                  '',                  3, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medium',     'Other',                                  '',                  4, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'priority',   'Primary',                                '',                  0, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'priority',   'Secondary',                              '',                  1, FALSE),
    -- Gender options. 'Other' is omitted — the free-text "Other..." field covers it.
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gender',     'N/A',                                    '',                  0, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gender',     'Male',                                   '',                  1, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gender',     'Female',                                 '',                  2, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gender',     'Non-Binary',                             '',                  3, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gender',     'Unknown',                                '',                  4, FALSE),
    -- Generation options with birth-year tooltips.
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'generation', 'Unknown',                                '',                  0, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'generation', 'Boomer',                                 'Born 1946–1964',    1, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'generation', 'Gen X',                                  'Born 1965–1980',    2, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'generation', 'Millennial',                             'Born 1981–1996',    3, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'generation', 'Gen Z',                                  'Born 1997–2012',    4, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'generation', 'Gen Alpha',                              'Born 2013–2025',    5, FALSE),
    -- Race / ethnicity options.
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'race',       'Unknown',                                '',                  0, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'race',       'Asian',                                  '',                  1, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'race',       'Black / African American / Afro-Caribbean', '',               2, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'race',       'Native Hawaiian / Pacific Islander',     '',                  3, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'race',       'Hispanic of any Race',                   '',                  4, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'race',       'Native American / Alaskan Native',       '',                  5, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'race',       'White',                                  '',                  6, FALSE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'race',       'Multiracial',                            '',                  7, FALSE)
ON CONFLICT (organization_id, kind, name) WHERE soft_delete = FALSE DO NOTHING;
