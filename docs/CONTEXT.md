# Ombuddi — Project Context

> Working document for the AI assistant. Keep updated as decisions land. Companion files: `ROADMAP.md`, `DATA_MODEL.md`, `LESSONS.md`.

## Guiding principles

1. **Pre-production freedom.** The app has never had real users. Backwards compatibility is not a concern and should be actively avoided as a justification for keeping bad choices around. Until we have a paying customer, schema changes, table renames, and breaking API edits are cheap — take them.
2. **Confidentiality is the product.** Every design decision is evaluated first against "does this protect a visitor's identity from a hostile party with broad access?" Convenience features lose if they erode this.
3. **Ombuds-first defaults, organization-customizable.** Ship sensible defaults (university-ombuds-shaped, IOA-aligned), but let every taxonomy — codes, roles, mediums, priorities — be replaced by the org without code changes.
4. **Aggregate by design, identifiable only when absolutely necessary.** Demographics, codes, mediums, and durations exist precisely so reports can be useful. Names, salt phrases, and notes are the only intentionally-identifying surface; everything else is bucketable.
5. **Ombuddi the company must not be able to read visitor data.** No support backdoor, no "we'll just take a look" mode, no admin override that decrypts. If a feature would require this, redesign the feature.

## What Ombuddi is

The first SaaS record-keeping product built specifically for Organizational Ombuds. Ombuds are neutral, confidential, non-mandated, off-hierarchy conflict-resolution professionals who meet with "visitors" (clients) and help them work through concerns about the organization, coworkers, or their role. Ombuds follow the **International Ombuds Association (IOA)** Standards of Practice and Code of Ethics, which include:

- Independence, neutrality, confidentiality, informality.
- **Routine destruction/purging of permanent records** so that even a court order yields very limited disclosable data.
- Aggregate trend reporting to leadership without revealing individual identities.

Existing tools are bad fits: paper, spreadsheets, student-conduct software, doctor's-office EHRs, etc. Ombuddi exists to fix that.

## Product vision (short form)

A logged-in ombuds, working under their organization's seat, can:

1. Create **cases** (one issue / one cluster of related concerns).
2. Add **entries** to a case — meeting date, duration, medium, notes, optional tags, optional people.
3. Search for / create **persons** (visitors and public persons), where visitor identity is gated behind a salt phrase the ombuds chose.
4. Tag cases/entries with **codes**, organized into customizable **categories**. IOA's nine Uniform Reporting Categories ship as application-level reference data (see "Settled decisions" below) and appear in the picker alongside the org's own codes.
5. Generate **aggregate reports** (trends, demographics, role mix, code mix) without revealing identities.
6. Trust that records auto-purge on a configurable schedule, with hooks to pause on legal hold.

## Security model

Two layered protections:

1. **Cryptographic name-hashing.** A "person" is stored only as `hashed_name = sha256(name + salt + org_name + server_salt)`. The user must re-supply the exact `name + salt` to retrieve. There is no way to enumerate visitors from the database. Server-side `NAME_SALT` (env var, see `service/hash_name.py`) prevents rainbow-table attacks against a stolen DB.
2. **Plaintext circumspection.** Even for fields that must be plaintext (case names, notes), the UI nudges toward randomized/non-identifying titles, and a random "security image" per case for visual recognition.
3. **Demographics are collected, not minimized.** Useful trend reporting requires generation, race, gender, primary role, international/domestic, etc. The protection lives in *aggregation* (bucketing on report) plus the lookup gate (no one without the salt phrase ever pulls these rows back). Edge cases — e.g. an org with only one male employee — collapse to identifying through process of elimination; that's an ombuds-judgment problem we surface in the UI rather than try to algorithmically solve.

Important nuance the user described and we should preserve: an ombuds can choose **how granular** their salt phrases are — one per org, one per ombuds, one per month, one per case, blank, or even with deliberate per-instance spelling variations. Two records of "the same person" under two salts are mathematically two different people. This is a feature, not a bug.

## Confidentiality boundaries

- Ombuddi staff, including admins, must NEVER be able to read meaningful visitor data. No "support" backdoor.
- An ombuds can only see records that hash to the salt phrase they currently supply. Even another ombuds in the same org sees nothing without the same phrase.
- Trend reports must be derivable from non-identifying fields (demographics, codes, role, medium, duration). Aggregations should respect minimum-cell-size thresholds to prevent re-identification.
- Notes are the most sensitive payload. Encrypting `entries.notes` at rest under a key derived from a per-user/per-case passphrase is a candidate for a follow-up phase.

## Architecture (current)

```
/web        Vite + React 18 + TS + MUI v5 + React Query + Zustand + react-router v6
            Auth scaffolding present (keycloak, @react-keycloak/web) but commented out;
            currently relies on a hard-coded user id in useUserId().

/service    Flask 3 + psycopg2 + Postgres 14 (via docker-compose)
            Generic CRUD helpers in src/utils.py drive most endpoints with a
            field-mapping dict (camelCase -> snake_case).

/files      Reference material: Ombuds Data .docx, IOA reporting categories.pdf.
```

API base: `http://localhost:5002/api/v1/...` in dev; same-host `https://` in prod (per `web/src/tools/db_tools/getter.ts`). CORS in `service/app.py` is currently pinned to `http://localhost:5173`.

## Current functional state (May 2026)

Working / wired:
- Sign-in stub: `useUserId()` returns a hard-coded UUID. Profile shows that ombuds row, links to their org.
- Organization page: edit org name (UI only), manage **Codes** and **Code Categories** (create, rename, soft-delete, reorder). Manage **Primary Roles** (org-customizable). IOA's 9 categories + 87 codes are loaded from `web/src/constants/ioaConstants.ts` so they appear in the Code picker alongside the user's own codes.
- Cases list, case create (`AddNewCase` — has IOA + org code selection, referral source UI scaffolded, randomized name button, picsum-seeded security image).
- Case summary page: shows case, codes (with `EditCodeDialog`), list of entries by date, hover-to-preview entry details. "Add Entry" button.
- Add entry form: date, duration, medium, entry priority radios, notes, and a People dialog that includes the `PersonFinder` (name + salt → hashed search) — but the Save button on the people dialog currently only closes; selected people aren't yet stored on the entry.
- Add person form: full demographics + salt phrase + secure/insecure toggle. Posts to `add_person` (the backend `_salt_name` hook re-hashes `hashedName` before insert).

Not yet working / stubbed:
- WelcomePage and Report page are placeholders.
- `/add_case` and `/log_without_case` routes referenced by `Cases.tsx` are NOT defined in `router.tsx`.
- Entry ↔ Person association: the schema includes `entry_person` (a join used by `SQL_PERSONS_BY_CASE_ID`), but there is no `add_entry_person` endpoint yet and the Add Entry dialog never persists the selection.
- Codes on entries (vs. only on cases): undecided. User leans toward allowing.
- Entry priority and medium customization at the org level: not implemented.
- Timed record purge: not implemented.
- Real authentication, multi-tenancy enforcement, subscription/billing: not implemented.

## Key files to know

| Purpose | Path |
|---|---|
| App entry, routing | `web/src/App.tsx`, `web/src/router.tsx` |
| Generic Flask CRUD | `service/src/utils.py` (`add_one`, `get_one`, `get_many`, `update_one`, `return_many`, …) |
| Name hashing (server) | `service/src/hash_name.py` (server salt via `NAME_SALT` env) |
| Name hashing (client) | `web/src/tools/useHashName.ts` (combines name + user salt + org name) |
| Person endpoints | `service/src/person_views.py` |
| Case/code/role endpoints | `service/src/ombuddi_views.py` |
| TS data shapes | `web/src/types/majorTypes.ts` |
| IOA codes (reference data) | `web/src/constants/ioaConstants.ts` |
| Code picker data source | `web/src/tools/useCodeSource.ts` |
| Code editor (org) | `web/src/components/organization/CodeSummary.tsx` |
| Code picker (cases) | `web/src/components/CodeSetterBox.tsx`, `OrgCodeSetter.tsx`, `EditCodeDialog.tsx` |
| Add case | `web/src/components/AddEntry/AddNewCase.tsx` |
| Add entry | `web/src/pages/AddEntry.tsx` |
| Add person | `web/src/components/AddPerson/AddPerson.tsx` |
| Person search | `web/src/components/PersonFinder.tsx` |

## First customer

A university ombuds. Defaults should reflect higher-ed reality: primary roles already include exempt, non-exempt, tenure/non-tenure faculty, undergrad/grad, alumni, parent, etc. IOA codes are the categorization backbone.

## Settled decisions (track here so we don't re-relitigate)

- **Org name is decorative.** Hashing, lookups, and any "is this row mine" checks key off `organization_id` (UUID). Org names are display-only and can be changed at any time.
- **Reports run in two modes**, toggled per render:
  - *Full mode* (ombuds-only): every bucket visible, no suppression. The ombuds can see narrow bands their own memory might be missing.
  - *Shareable mode* (for leadership): minimum cell size enforced (default 5, org-configurable); below-threshold buckets are merged into "Other" or suppressed entirely. This is the only version that can be exported / shared.
- **Authentication: Keycloak.** The scaffolding is partly in place, the user knows the system, the audience is bounded (rare profession), so the per-seat economics of managed providers don't pay back. Self-hosted Keycloak in the same compose stack.
- **No backwards compatibility constraints** while pre-production. See Guiding Principle 1.
- **IOA reporting categories and codes are application-level reference data, not DB rows.** They live in `web/src/constants/ioaConstants.ts`, with deterministic uuid5-derived ids resolved at runtime. A future "Hospital ombuds defaults" or "Government ombuds defaults" pack ships the same way: another constants file with another uuid5 namespace. No "fake organization" rows; no cross-org read exception in the multi-tenancy model.

## Open product questions (resolve before/with the user)

- Tags on **entries** in addition to cases? Probable yes; need UI and a `entry_codes` join (vs. reusing `cases.codes` only).
- Entry medium and priority: org-customizable lists, or stay hard-coded? Likely customizable.
- Salt-phrase UX: how strongly do we guide ombuds toward a sensible default (per-org? per-ombuds? per-month?) without locking them into one?
- Per-case salt for **entry notes** (encrypted at rest) — phase 2 or phase 1?
- Public Persons UX: where do they show up vs. visitors? Likely a separate "Public People" admin pane, plus a checkbox in the AddPerson flow.
- Court-order / legal-hold flow: who can pause purges, how is it audited, and is that audit itself outside the standard purge?

## Submission target

Once functional, submit to IOA for feedback / informal blessing. That means we should be able to walk an IOA reviewer through how each Standard of Practice is honored — confidentiality, independence, neutrality, informality, and especially record-retention practices.
