-- Demo seed: ten cases with entries, a shared public person, and entry_person
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
--
-- Person roster (all salt = 'demo'):
--   dd…001  Dr. Patricia Morgan  public / exempt / Boomer / White / Female
--   dd…002  Alex Rivera          grad / Millennial / Hispanic / Male
--   dd…003  Jordan Kim           undergrad / Gen Z / Asian / Non-Binary
--   dd…004  Sam Okafor           exempt / Gen X / Black / Male
--   dd…005  Casey Williams       nonexempt / Boomer / White / Female
--   dd…006  Morgan Chen          exempt / Gen X / Asian / Female / international
--   dd…007  Jamie Osei           nonexempt / Millennial / Black / Male
--   dd…008  Riley Patel          grad / Gen Z / Asian / Female
--   dd…009  Marcus Johnson       exempt / Gen X / Black / Male
--   dd…010  Sofia Hernandez      undergrad / Gen Z / Hispanic / Female
--   dd…011  David Lee            exempt / Millennial / Asian / Male
--   dd…012  Priya Sharma         grad / Gen Z / Asian / Female
--   dd…013  Tom Mitchell         nonexempt / Boomer / White / Male


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
-- Case 1: Mentorship Boundary Concern  (Mar–Apr 2026, active)
-- Codes: 4K Career Dev · 2E Communication · 2B Respect-Treatment
-- Primary: Alex Rivera (dd…002)  |  Shared: Sam Okafor (dd…004), Dr. Patricia Morgan (dd…001)
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
-- Case 2: Grade Appeal Navigation  (Apr–May 2026, closed)
-- Codes: 7C Admin Decisions · 2M Grading · 7B Responsiveness
-- Primary: Jordan Kim (dd…003)  |  Shared: Casey Williams (dd…005), Dr. Patricia Morgan (dd…001)
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
    'closed',
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
-- Case 3: Harassment and Climate Concern  (May–Jun 2026, active)
-- Codes: 5C Harassment · 2B Respect-Treatment · 2G Diversity-Related
-- Primary: Morgan Chen (dd…006)  |  Shared: Alex Rivera (dd…002)
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
-- Case 4: Position Elimination Dispute  (May–Jun 2026, monitoring)
-- Codes: 4J Position Elimination · 8C Positional Power · 4D Tenure-Position Security
-- Primary: Jamie Osei (dd…007)  |  Shared: Jordan Kim (dd…003)
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
    'monitoring',
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


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 5: Research Misconduct Allegation  (Feb–Aug 2025, monitoring)
-- Codes: 2R Equity · 7C Admin Decisions · 5C Harassment
-- Primary: Riley Patel (dd…008)  |  Consult: David Lee (dd…011)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000050',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Research Misconduct Allegation',
    'Graduate student alleging unfair attribution of research contributions and hostile response from supervisor.',
    ARRAY[
        'bc3146aa-c566-5573-965a-1d950bbf9ac5',
        'e85c9daf-82a3-511c-a4ed-c645c8ffbbd8',
        '726d7645-67b1-536c-b809-1ccebc04f76b'
    ]::uuid[],
    'monitoring',
    '2025-02-12 10:00:00+00',
    '2025-08-07 14:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000051',
        'dd000000-0000-0000-0000-000000000050',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-02-12',
        'In Person',
        60,
        'Initial intake. Visitor described a situation in which their research contributions to a co-authored publication were minimized and they received a hostile reaction when raising the issue with their PI. Discussed options: informal conversation, department ombuds referral, and formal research integrity process. Visitor wants to document the situation before taking further steps.'
    ),
    (
        'dd000000-0000-0000-0000-000000000052',
        'dd000000-0000-0000-0000-000000000050',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-02-28',
        'Phone',
        30,
        'Consultation with a faculty member (research lab administrator) seeking general information on research attribution norms and institutional policy. No identifying information about the graduate student shared. Provided overview of authorship guidelines and grievance timelines.'
    ),
    (
        'dd000000-0000-0000-0000-000000000053',
        'dd000000-0000-0000-0000-000000000050',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-04-03',
        'In Person',
        75,
        'Follow-up with original visitor. Situation has escalated — supervisor excluded visitor from a lab meeting and sent a hostile email. Visitor brought documentation. Reviewed informal vs. formal pathways in detail. Visitor considering filing a formal research integrity complaint. Ombuds provided written summary of options and relevant policy citations.'
    ),
    (
        'dd000000-0000-0000-0000-000000000054',
        'dd000000-0000-0000-0000-000000000050',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-05-15',
        'Videoconference',
        45,
        'Check-in. Visitor reports formal complaint was filed with the Research Integrity Office. Waiting for acknowledgment. Emotional support provided; discussed coping strategies and available counseling resources. No ombuds action pending while formal process is underway.'
    ),
    (
        'dd000000-0000-0000-0000-000000000055',
        'dd000000-0000-0000-0000-000000000050',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-08-07',
        'Phone',
        20,
        'Brief check-in at visitor request. Formal investigation ongoing; visitor satisfied with the process so far. Ombuds remains available but no active role at this time. Case moved to monitoring.'
    )
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 6: Workload Inequity Complaint  (Mar–Sep 2025, active)
-- Codes: 8C Positional Power · 2B Respect-Treatment · 2R Equity
-- Primary: Marcus Johnson (dd…009)  |  Consult: Priya Sharma (dd…012), Sam Okafor (dd…004)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000060',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Workload Inequity Complaint',
    'Faculty member raising concern that administrative assignments are disproportionately assigned along demographic lines.',
    ARRAY[
        'd6ca972f-3572-55ea-a8e3-aef82dec808e',
        '789e8ae7-7909-59a7-a9be-1d68c35aab56',
        'bc3146aa-c566-5573-965a-1d950bbf9ac5'
    ]::uuid[],
    'active',
    '2025-03-05 09:00:00+00',
    '2025-09-10 16:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000061',
        'dd000000-0000-0000-0000-000000000060',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-03-05',
        'In Person',
        60,
        'Initial intake. Visitor, a tenured faculty member, described a pattern in which faculty of color in their department are assigned disproportionately high service burdens — committee work, student advising, and event coordination — compared to white colleagues at the same rank. Visitor has data comparing assignments over three years. Explored informal and formal options. Visitor wants to raise awareness without triggering retaliation.'
    ),
    (
        'dd000000-0000-0000-0000-000000000062',
        'dd000000-0000-0000-0000-000000000060',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-03-20',
        'Phone',
        30,
        'Consultation with a graduate student who noticed the same pattern and wanted to understand what, if anything, they could do to support affected colleagues. Provided general information on advocacy options and departmental governance structures. No identifying information about faculty shared.'
    ),
    (
        'dd000000-0000-0000-0000-000000000063',
        'dd000000-0000-0000-0000-000000000060',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-05-08',
        'In Person',
        45,
        'Follow-up with original visitor. Department chair responded dismissively to an informal inquiry visitor made independently. Visitor now interested in whether the ombuds can facilitate a structured conversation with the chair. Discussed shuttle diplomacy option and potential for a facilitated dialogue. Visitor wants to think it over before committing.'
    ),
    (
        'dd000000-0000-0000-0000-000000000064',
        'dd000000-0000-0000-0000-000000000060',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-09-10',
        'In Person',
        60,
        'Joint meeting with original visitor and a colleague (exempt staff, same department) who has experienced similar treatment. Both consented to the joint session. Discussed shared concerns and options for collective action, including petition to dean''s office and formal equity complaint. Agreed to draft a written summary of the pattern for the ombuds to review informally. No formal action taken by ombuds.'
    )
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 7: Academic Integrity Concern  (Jun–Sep 2025, monitoring)
-- Codes: 7C Admin Decisions · 2M Grading · 7B Responsiveness
-- Primary: Sofia Hernandez (dd…010)  |  Witness: Riley Patel (dd…008)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000070',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Academic Integrity Concern',
    'Undergraduate student concerned about inconsistent application of academic integrity policy in their course.',
    ARRAY[
        'e85c9daf-82a3-511c-a4ed-c645c8ffbbd8',
        '5c0a26e2-6c0f-5805-8924-842c038bcee6',
        '2c592d05-7990-50e2-918c-15d64c3fdeb2'
    ]::uuid[],
    'monitoring',
    '2025-06-03 11:00:00+00',
    '2025-09-16 15:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000071',
        'dd000000-0000-0000-0000-000000000070',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-06-03',
        'In Person',
        50,
        'Initial intake. Visitor received an academic integrity violation finding for alleged collaboration on an exam. Visitor asserts the collaboration policy was not clearly communicated and that another student in the same situation received a lesser sanction. Reviewed the formal appeal process and the role of the Dean of Students office. Visitor wants to appeal but is concerned about the process feeling adversarial.'
    ),
    (
        'dd000000-0000-0000-0000-000000000072',
        'dd000000-0000-0000-0000-000000000070',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-06-18',
        'Email',
        15,
        'Email from visitor with questions about the timeline for the formal appeal. Responded with relevant deadlines and suggested visitor confirm receipt of their appeal submission. Noted that the ombuds is not a formal advocate but can help visitor understand the process.'
    ),
    (
        'dd000000-0000-0000-0000-000000000073',
        'dd000000-0000-0000-0000-000000000070',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-07-22',
        'Phone',
        30,
        'Consultation with a graduate teaching assistant who proctored the exam in question and had questions about their obligations in the appeal process. Provided general information on the limits of the TA role and encouraged them to consult with their supervising faculty member. No identifying information about the student shared.'
    ),
    (
        'dd000000-0000-0000-0000-000000000074',
        'dd000000-0000-0000-0000-000000000070',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-09-16',
        'Videoconference',
        45,
        'Follow-up with original visitor. Appeal panel upheld the original finding but reduced the sanction. Visitor is disappointed but has decided not to pursue further action. Discussed impact on academic record and options for petition if the sanction affects graduation requirements. Case moved to monitoring pending grade petition outcome.'
    )
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 8: Salary Disparity Inquiry  (Aug–Nov 2025, closed)
-- Codes: 2R Equity · 8C Positional Power · 4D Tenure-Position Security
-- Primary: Marcus Johnson (dd…009)  |  Separate: David Lee (dd…011), Tom Mitchell (dd…013)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000080',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Salary Disparity Inquiry',
    'Multiple staff members independently raising concerns about unexplained salary gaps within the same job classification.',
    ARRAY[
        'bc3146aa-c566-5573-965a-1d950bbf9ac5',
        'd6ca972f-3572-55ea-a8e3-aef82dec808e',
        '2c5b4b5e-d1b6-51e6-9b69-5d69b8bdfc28'
    ]::uuid[],
    'closed',
    '2025-08-19 09:00:00+00',
    '2025-11-05 17:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000081',
        'dd000000-0000-0000-0000-000000000080',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-08-19',
        'In Person',
        60,
        'Initial intake. Visitor, an exempt professional staff member, discovered through a public salary database that colleagues in the same job classification earn significantly more. Visitor has been in the role eight years and has received strong performance reviews. Explored options including a direct conversation with HR, a formal pay equity complaint, and consultation with a union representative. Visitor wants to understand the legal and institutional context first.'
    ),
    (
        'dd000000-0000-0000-0000-000000000082',
        'dd000000-0000-0000-0000-000000000080',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-09-02',
        'Phone',
        30,
        'Separate consultation with another exempt staff member who identified a similar gap in their own salary. No identifying information about the first visitor shared. Provided the same overview of options. Visitor asked whether the ombuds could raise the pattern with HR on an anonymous basis. Discussed the limits of the ombuds role and the concept of systemic recommendations.'
    ),
    (
        'dd000000-0000-0000-0000-000000000083',
        'dd000000-0000-0000-0000-000000000080',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-10-14',
        'In Person',
        45,
        'Follow-up with original visitor. HR meeting took place; HR acknowledged the gap but attributed it to market adjustments at time of hire. Visitor unsatisfied with the explanation. Discussed whether to file a formal pay equity complaint and what documentation would be needed. Visitor will consult with an employment attorney before deciding.'
    ),
    (
        'dd000000-0000-0000-0000-000000000084',
        'dd000000-0000-0000-0000-000000000080',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-11-05',
        'Email',
        15,
        'Email from original visitor. After consulting an attorney, visitor has decided not to pursue a formal complaint at this time but will document the issue and revisit next performance cycle. Visitor thanks ombuds for the guidance. Case closed at visitor request.'
    )
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 9: Visa and Immigration Support  (Oct 2025–Feb 2026, monitoring)
-- Codes: 4D Tenure-Position Security · 2G Diversity-Related · 4K Career Dev
-- Primary: Priya Sharma (dd…012)  |  Shared: Sofia Hernandez (dd…010), Jordan Kim (dd…003)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-000000000090',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Visa and Immigration Support',
    'International student concerned that delays in sponsored visa renewal are jeopardizing academic standing and research timeline.',
    ARRAY[
        '2c5b4b5e-d1b6-51e6-9b69-5d69b8bdfc28',
        '9c74fdd9-7f49-566f-b064-93c8b07354f6',
        '40d7147c-d410-53fe-b126-1adb3ca9b1df'
    ]::uuid[],
    'monitoring',
    '2025-10-07 10:00:00+00',
    '2026-02-25 11:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-000000000091',
        'dd000000-0000-0000-0000-000000000090',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-10-07',
        'In Person',
        45,
        'Initial intake. Visitor is an international graduate student whose visa renewal has been pending for four months due to an administrative delay in the sponsoring department. The delay is affecting their ability to travel for fieldwork and creating uncertainty about their enrollment status. Discussed options: escalation through international student services, ombuds outreach to department administrator, and interim accommodations. Visitor concerned about retaliatory impact on their funding.'
    ),
    (
        'dd000000-0000-0000-0000-000000000092',
        'dd000000-0000-0000-0000-000000000090',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-10-22',
        'Phone',
        25,
        'Follow-up call. Visitor reported that international student services acknowledged the delay but could not give a timeline. Visitor is now considering whether to raise the issue formally. Provided information on the Dean of Graduate Studies office and relevant timelines. Discussed how to frame the concern without jeopardizing the relationship with the sponsoring faculty member.'
    ),
    (
        'dd000000-0000-0000-0000-000000000093',
        'dd000000-0000-0000-0000-000000000090',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2025-11-12',
        'Videoconference',
        40,
        'Consultation with another international student who had experienced a similar delay the previous year and wanted to share their experience and ask about support options. Provided general information on the process and available resources. No identifying information about the primary visitor shared. Visitor found the conversation helpful and will connect with the international student association.'
    ),
    (
        'dd000000-0000-0000-0000-000000000094',
        'dd000000-0000-0000-0000-000000000090',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-01-14',
        'In Person',
        60,
        'Follow-up with original visitor. Visa renewal came through in December, but visitor missed a fieldwork window and had to defer a dissertation chapter. Now concerned about the impact on their expected graduation date and funding eligibility. Discussed options for requesting a funding extension and the process for academic timeline adjustment. Ombuds agreed to provide an informal summary of the visa timeline situation for the visitor''s advisor meeting.'
    ),
    (
        'dd000000-0000-0000-0000-000000000095',
        'dd000000-0000-0000-0000-000000000090',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-02-25',
        'Phone',
        20,
        'Brief check-in. Visitor met with advisor; funding extension request is under review. Visitor feeling more settled. No further ombuds action needed at this time. Case moved to monitoring pending funding decision.'
    )
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Case 10: Retaliation Concern  (Jan–Apr 2026, active)
-- Codes: 5C Harassment · 8C Positional Power · 4J Position Elimination
-- Primary: Tom Mitchell (dd…013)  |  Shared: Alex Rivera (dd…002)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO cases (id, organization_id, name, description, codes, status, created_at, updated_at)
VALUES (
    'dd000000-0000-0000-0000-0000000000a0',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Retaliation Concern',
    'Staff member alleging adverse treatment following an internal complaint filed earlier in the year.',
    ARRAY[
        '726d7645-67b1-536c-b809-1ccebc04f76b',
        'd6ca972f-3572-55ea-a8e3-aef82dec808e',
        '34987e44-0320-5ed2-83ec-90b91e4e2494'
    ]::uuid[],
    'active',
    '2026-01-08 09:30:00+00',
    '2026-04-02 10:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, case_id, ombuds_id, organization_id, date, medium, duration, notes)
VALUES
    (
        'dd000000-0000-0000-0000-0000000000a1',
        'dd000000-0000-0000-0000-0000000000a0',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-01-08',
        'In Person',
        75,
        'Initial intake. Visitor filed an internal complaint against their supervisor in October 2025 related to the position elimination case handled last year. Since the complaint, visitor has been excluded from team meetings, denied a routine training opportunity, and received a negative performance note they believe is unfounded. Visitor believes these actions constitute retaliation. Explored options: HR anti-retaliation complaint, direct outreach to HR liaison, and documentation strategies. Visitor is distressed and concerned about job security.'
    ),
    (
        'dd000000-0000-0000-0000-0000000000a2',
        'dd000000-0000-0000-0000-0000000000a0',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-02-03',
        'Phone',
        30,
        'Follow-up call. Visitor has been keeping a detailed log of incidents as recommended. No new overt retaliation but the working climate remains hostile. Discussed whether to file an HR anti-retaliation complaint now or continue documenting. Visitor wants to wait for one more incident before filing to strengthen the case. Ombuds encouraged visitor to consult with an employee advocate as well.'
    ),
    (
        'dd000000-0000-0000-0000-0000000000a3',
        'dd000000-0000-0000-0000-0000000000a0',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-03-11',
        'In Person',
        60,
        'Joint session at visitor request. A grad student colleague (witness to some of the exclusionary treatment) joined to provide context on the team dynamic. Both consented. Visitor''s colleague confirmed the pattern from an outside perspective without disclosing anything confidential. Discussed collective documentation and the difference between witness statements in informal vs. formal processes. No ombuds action taken beyond coaching on documentation.'
    ),
    (
        'dd000000-0000-0000-0000-0000000000a4',
        'dd000000-0000-0000-0000-0000000000a0',
        'b73d0105-af49-484f-87a3-217af3feff90',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-04-02',
        'Videoconference',
        45,
        'Follow-up with original visitor. Visitor filed the anti-retaliation complaint with HR last week. HR acknowledged receipt. Visitor anxious about next steps. Reviewed what to expect from the HR investigation process and how to manage interactions with supervisor in the interim. Ombuds remains available as a resource. No further action at this time.'
    )
ON CONFLICT (id) DO NOTHING;


-- ── Public person → entries in cases 1 and 2 ─────────────────────────────────
INSERT INTO entry_person (entry_id, person_id) VALUES
    ('dd000000-0000-0000-0000-000000000011', 'dd000000-0000-0000-0000-000000000001'),
    ('dd000000-0000-0000-0000-000000000021', 'dd000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
