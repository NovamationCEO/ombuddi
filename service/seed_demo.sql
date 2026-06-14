-- Demo seed: four cases with entries, a shared public person, and entry_person
-- joins for both public and private persons. Private persons are inserted
-- separately by seed_demo.py (they require the server-side NAME_SALT from .env).
--
-- Run AFTER seed_dev.sql, from the service/ directory:
--   docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < seed_demo.sql
--   set -a; source .env; set +a
--   python seed_demo.py | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME"
--
-- Idempotent: ON CONFLICT DO NOTHING. Safe to re-run on a fresh DB.
-- All salt phrases for this seed are 'demo'.
--
-- IOA code UUIDs are derived via uuidv5 in ioaConstants.ts; see comments below.
-- Codes used:
--   2B  789e8ae7-7909-59a7-a9be-1d68c35aab56  Respect-Treatment
--   2E  013d0ee3-18ef-52e7-86ad-dfc0a1218a26  Communication
--   2G  9c74fdd9-7f49-566f-b064-93c8b07354f6  Diversity-Related
--   2M  5c0a26e2-6c0f-5805-8924-842c038bcee6  Performance Appraisal-Grading
--   2R  bc3146aa-c566-5573-965a-1d950bbf9ac5  Equity of Treatment
--   4D  2c5b4b5e-d1b6-51e6-9b69-5d69b8bdfc28  Tenure-Position Security-Ambiguity
--   4J  34987e44-0320-5ed2-83ec-90b91e4e2494  Position Elimination
--   4K  40d7147c-d410-53fe-b126-1adb3ca9b1df  Career Development, Coaching, Mentoring
--   5C  726d7645-67b1-536c-b809-1ccebc04f76b  Harassment
--   7B  2c592d05-7990-50e2-918c-15d64c3fdeb2  Responsiveness-Timeliness
--   7C  e85c9daf-82a3-511c-a4ed-c645c8ffbbd8  Administrative Decisions and Interpretation
--   8C  d6ca972f-3572-55ea-a8e3-aef82dec808e  Use of Positional Power-Authority


-- ── Public person (shared across cases 1 and 2) ───────────────────────────────
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


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 1: Mentorship Boundary Concern
-- Codes: 4K Career Coaching/Mentoring · 2E Communication · 2B Respect-Treatment
-- Primary visitor: Alex Rivera (private, seeded by seed_demo.py)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000010',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Mentorship Boundary Concern',
    'Graduate student seeking guidance on professional boundaries within their mentorship relationship.',
    ARRAY[
        '40d7147c-d410-53fe-b126-1adb3ca9b1df',
        '013d0ee3-18ef-52e7-86ad-dfc0a1218a26',
        '789e8ae7-7909-59a7-a9be-1d68c35aab56'
    ]::uuid[],
    'active',
    '2026-03-03 09:00:00+00',
    '2026-04-07 11:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

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


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 2: Grade Appeal Navigation
-- Codes: 7C Administrative Decisions · 2M Performance Appraisal-Grading · 7B Responsiveness
-- Primary visitor: Jordan Kim (private, seeded by seed_demo.py)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000020',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Grade Appeal Navigation',
    'Student seeking guidance on grade appeal process and academic policy interpretation.',
    ARRAY[
        'e85c9daf-82a3-511c-a4ed-c645c8ffbbd8',
        '5c0a26e2-6c0f-5805-8924-842c038bcee6',
        '2c592d05-7990-50e2-918c-15d64c3fdeb2'
    ]::uuid[],
    'active',
    '2026-04-14 10:00:00+00',
    '2026-05-06 14:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

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


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 3: Harassment and Climate Concern
-- Codes: 5C Harassment · 2B Respect-Treatment · 2G Diversity-Related
-- Primary visitor: Morgan Chen (private, seeded by seed_demo.py)
-- Shared person: Alex Rivera (from Case 1) — consulted as a colleague witness
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000030',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Harassment and Climate Concern',
    'Faculty member raising concerns about a pattern of exclusionary behavior and hostile remarks in their department.',
    ARRAY[
        '726d7645-67b1-536c-b809-1ccebc04f76b',
        '789e8ae7-7909-59a7-a9be-1d68c35aab56',
        '9c74fdd9-7f49-566f-b064-93c8b07354f6'
    ]::uuid[],
    'active',
    '2026-05-12 09:30:00+00',
    '2026-06-02 10:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000031',
        'dd000000-0000-0000-0000-000000000030',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-05-12',
        'In Person',
        50,
        'Initial intake. Visitor described a pattern of exclusion from departmental decisions and repeated dismissive remarks from a senior colleague. Concerned about impact on promotion review. Ombuds listened, provided information on complaint processes and informal resolution options. Visitor wants to consider options before proceeding.'
    ),
    (
        'dd000000-0000-0000-0000-000000000032',
        'dd000000-0000-0000-0000-000000000030',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-05-20',
        'Phone',
        30,
        'Separate consultation with a graduate student who had witnessed some of the departmental interactions in question and sought guidance on their own role. Provided general information on bystander options and available support resources. No third-party information shared.'
    ),
    (
        'dd000000-0000-0000-0000-000000000033',
        'dd000000-0000-0000-0000-000000000030',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-06-02',
        'Videoconference',
        45,
        'Follow-up with original visitor. Visitor reports no change in behavior from the colleague. Discussed escalation pathways including formal Title IX/equity office referral and HR complaint. Visitor will consult with legal counsel before deciding. Ombuds provided written summary of process options.'
    )
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 4: Position Elimination Dispute
-- Codes: 4J Position Elimination · 8C Use of Positional Power · 4D Tenure-Position Security
-- Primary visitor: Jamie Osei (private, seeded by seed_demo.py)
-- Shared person: Jordan Kim (from Case 2) — separately affected by the same restructuring
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000040',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Position Elimination Dispute',
    'Staff member disputing the basis for a position elimination decision during departmental restructuring.',
    ARRAY[
        '34987e44-0320-5ed2-83ec-90b91e4e2494',
        'd6ca972f-3572-55ea-a8e3-aef82dec808e',
        '2c5b4b5e-d1b6-51e6-9b69-5d69b8bdfc28'
    ]::uuid[],
    'active',
    '2026-05-27 14:00:00+00',
    '2026-06-10 09:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000041',
        'dd000000-0000-0000-0000-000000000040',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-05-27',
        'In Person',
        60,
        'Initial intake. Visitor received notice that their position would be eliminated as part of a departmental restructuring. Visitor believes the selection criteria were applied inconsistently and that the decision may be retaliatory in nature. Ombuds outlined informal and formal options, including HR appeal process and meeting with department leadership.'
    ),
    (
        'dd000000-0000-0000-0000-000000000042',
        'dd000000-0000-0000-0000-000000000040',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-06-03',
        'Phone',
        30,
        'Separate intake from another employee in the same department, also notified of position elimination. Visitor had questions about the appeals timeline and whether the ombuds could facilitate a conversation with HR. Provided process information and clarified ombuds role and limitations. No identifying information about the other affected employee shared.'
    ),
    (
        'dd000000-0000-0000-0000-000000000043',
        'dd000000-0000-0000-0000-000000000040',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-06-10',
        'Email',
        15,
        'Email from original visitor indicating they submitted a formal HR appeal and requested the ombuds remain available as a resource if the appeal is denied. Ombuds confirmed availability and provided contact for the Employee Assistance Program. No further action at this time.'
    )
ON CONFLICT (id) DO NOTHING;


-- ── Public person → first entry of cases 1 and 2 ─────────────────────────────
INSERT INTO entry_person (entry_id, person_id) VALUES
    ('dd000000-0000-0000-0000-000000000011', 'dd000000-0000-0000-0000-000000000001'),
    ('dd000000-0000-0000-0000-000000000021', 'dd000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
