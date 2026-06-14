-- Demo seed: two cases with entries, a shared public person, and entry_person
-- joins for that public person. Private persons are inserted separately by
-- seed_demo.py (they require the server-side NAME_SALT from .env).
--
-- Run AFTER seed_dev.sql, from the service/ directory:
--   docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < seed_demo.sql
--   set -a; source .env; set +a
--   python seed_demo.py
--
-- Idempotent: ON CONFLICT DO NOTHING. Safe to re-run.
-- All salt phrases for this seed are 'demo'.

-- ── Public person (shared across both cases) ──────────────────────────────────
INSERT INTO persons (
    id, is_public, public_name, primary_role, gender, generation, race,
    is_international, organization_id
) VALUES (
    'dd000000-0000-0000-0000-000000000001',
    TRUE,
    'Dr. Patricia Morgan',
    'exempt',
    'Female',
    'Boomer',
    'White',
    FALSE,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
ON CONFLICT (id) DO NOTHING;

-- ── Case 1: Mentorship Boundary Concern ──────────────────────────────────────
INSERT INTO cases (id, organization_id, name, description, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000010',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Mentorship Boundary Concern',
    'Graduate student seeking guidance on professional boundaries within their mentorship relationship.',
    'active',
    '2026-03-03 09:00:00+00',
    '2026-04-07 11:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Case 1 entries
INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000011',
        'dd000000-0000-0000-0000-000000000010',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-03-03',
        'In Person',
        60,
        'Initial intake. Visitor presented concern regarding mentorship dynamics and professional boundary expectations within their graduate program. Dr. Patricia Morgan joined briefly to provide context on department-level policies. Explored options including informal conversation, policy clarification, and facilitated dialogue. Visitor will reflect before deciding on next steps.'
    ),
    (
        'dd000000-0000-0000-0000-000000000012',
        'dd000000-0000-0000-0000-000000000010',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-03-12',
        'Phone',
        30,
        'Follow-up call. Visitor reported partial resolution of immediate tension. Discussed ongoing communication strategies. Visitor considering whether to pursue further action or monitor situation. No new escalation.'
    ),
    (
        'dd000000-0000-0000-0000-000000000013',
        'dd000000-0000-0000-0000-000000000010',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-03-24',
        'Videoconference',
        45,
        'Consultation requested by staff member seeking general guidance on handling interpersonal tensions in their unit. General information provided on department resources and communication approaches. No identifying information about third parties exchanged.'
    ),
    (
        'dd000000-0000-0000-0000-000000000014',
        'dd000000-0000-0000-0000-000000000010',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-04-07',
        'In Person',
        30,
        'Closing meeting. Visitor reports improved working relationship following informal conversations. No further ombuds involvement requested. Case moved to monitoring status.'
    )
ON CONFLICT (id) DO NOTHING;

-- ── Case 2: Grade Appeal Navigation ──────────────────────────────────────────
INSERT INTO cases (id, organization_id, name, description, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000020',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Grade Appeal Navigation',
    'Student seeking guidance on grade appeal process and academic policy interpretation.',
    'active',
    '2026-04-14 10:00:00+00',
    '2026-05-06 14:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Case 2 entries
INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000021',
        'dd000000-0000-0000-0000-000000000020',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-04-14',
        'In Person',
        45,
        'Initial intake. Visitor seeking guidance on grade appeal process and academic policy interpretation. Dr. Patricia Morgan joined briefly to clarify formal policy language and applicable timelines. Visitor wants to understand all options before deciding whether to pursue a formal appeal.'
    ),
    (
        'dd000000-0000-0000-0000-000000000022',
        'dd000000-0000-0000-0000-000000000020',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-04-22',
        'Email',
        15,
        'Email exchange. Visitor provided additional context and documentation. Reviewed options: informal conversation with faculty member, formal grade appeal, or allowing the matter to rest. Visitor leaning toward informal resolution as a first step.'
    ),
    (
        'dd000000-0000-0000-0000-000000000023',
        'dd000000-0000-0000-0000-000000000020',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-05-06',
        'Phone',
        20,
        'Consultation with staff member regarding standard grading practices and documentation requirements in the relevant department. General information only; no visitor-specific details disclosed.'
    )
ON CONFLICT (id) DO NOTHING;

-- ── Public person → entry_person (first entry of each case) ──────────────────
INSERT INTO entry_person (entry_id, person_id) VALUES
    ('dd000000-0000-0000-0000-000000000011', 'dd000000-0000-0000-0000-000000000001'),
    ('dd000000-0000-0000-0000-000000000021', 'dd000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
