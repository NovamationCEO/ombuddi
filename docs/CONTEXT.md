# Ombuddi — Project Context

> Working document for the AI assistant. Keep updated as decisions land. Companion files: `ROADMAP.md`, `DATA_MODEL.md`, `LESSONS.md`.

## Guiding principles

1. **Alpha-stage freedom, with production care.** The product is still early enough to correct poor designs, but a live alpha database now exists. Keep improving the model, while treating production schema changes as ordered migrations that preserve existing alpha data.
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

1. **Cryptographic name-hashing.** A visitor is stored under a hash derived from the name, user-supplied salt phrase, immutable organization UUID, and server-side `NAME_SALT`. The user must re-supply the same identifying inputs to retrieve the visitor. Organization names are deliberately excluded so renames cannot orphan records.
2. **Plaintext circumspection.** Even for fields that remain plaintext, such as case names, the UI nudges toward randomized/non-identifying titles and provides a random "security image" per case for visual recognition. Entry notes use client-side encryption.
3. **Demographics are collected, not minimized.** Useful trend reporting requires generation, race, gender, primary role, international/domestic, etc. The protection lives in *aggregation* (bucketing on report) plus the lookup gate (no one without the salt phrase ever pulls these rows back). Edge cases — e.g. an org with only one male employee — collapse to identifying through process of elimination; that's an ombuds-judgment problem we surface in the UI rather than try to algorithmically solve.

Important nuance the user described and we should preserve: an ombuds can choose **how granular** their salt phrases are — one per org, one per ombuds, one per month, one per case, blank, or even with deliberate per-instance spelling variations. Two records of "the same person" under two salts are mathematically two different people. This is a feature, not a bug.

## Confidentiality boundaries

- Ombuddi staff, including admins, must NEVER be able to read meaningful visitor data. No "support" backdoor.
- An ombuds can only see records that hash to the salt phrase they currently supply. Even another ombuds in the same org sees nothing without the same phrase.
- Trend reports must be derivable from non-identifying fields (demographics, codes, role, medium, duration). Aggregations should respect minimum-cell-size thresholds to prevent re-identification.
- Notes are encrypted client-side with AES-256-GCM before being stored. The key is derived from the salt phrase and organization UUID; the server and Ombuddi administrators do not receive the plaintext key.

## Architecture (current)

```
/web        Vite 8 + React 19 + TypeScript 6 + MUI 9 + React Query + Zustand.
            npm is the sole package manager. Auth0 handles authentication;
            the access token is sent to the API and never used as a local ID.

/service    Flask 3 + psycopg2 + Postgres 14 (via docker-compose)
            Generic CRUD helpers in src/utils.py drive most endpoints with a
            field-mapping dict (camelCase -> snake_case). Auth0 `sub` resolves
            through `ombuds.auth0_sub` to local ombuds and organization UUIDs.

/files      Reference material: Ombuds Data .docx, IOA reporting categories.pdf.
```

API base: `http://localhost:5002/api/v1/...` in dev; same-host `https://` in prod (per `web/src/tools/db_tools/getter.ts`). CORS currently combines unrestricted Flask-Cors with a `FRONTEND_URL` response header and is bookmarked for consolidation.

## Current functional state (August 9, 2026)

Working / wired:

- Auth0 access tokens are validated by the API. Auth0's textual `sub` is stored only in `ombuds.auth0_sub`; local UUIDs remain the primary and foreign keys throughout the application.
- Every authenticated request resolves the local user and organization from the database. Unlinked identities can only reach the invitation-claim endpoint. Deactivated users and organizations are rejected centrally.
- Organization administrators can create seats, grant organization-admin status, edit unlinked seat emails, issue one-time invitations, and deactivate/reactivate eligible users. Seat limits have a database-enforced minimum of one.
- System administrators can create and manage organizations and organization administrators, change seat limits, and deactivate/reactivate organizations. Status changes are written to an immutable audit trail.
- Invitations are bound to the intended normalized email, expire, are single-use, and store only a token hash. Auth0 supplies signed verified-email claims through the Post-Login Action chain.
- Tenant ownership is enforced in API writes and by database relationships/triggers for cross-table associations. Local identity and organization fields are force-stamped from the authenticated principal rather than accepted from request data.
- Cases, entries, entry-person links, encrypted notes, codes/categories, primary roles, public persons, demographic picklists, and report aggregation are implemented.
- Database errors return stable client-safe messages while detailed exceptions remain in server logs. Shared CRUD/report/person paths use a common commit/rollback/close lifecycle helper.
- Backend and frontend regression suites are active. As of this update: 48 backend tests and 4 frontend tests pass; frontend lint and production build also pass.
- Frontend dependency management is standardized on npm. Generated Python bytecode and Yarn runtime files are no longer tracked.

Still incomplete:

- Automated record retention/purge, subscription billing, invitation email delivery, and a self-service organization onboarding flow.
- `/log_without_case` remains unresolved.
- Production schema migrations are still applied manually in order; see `docs/ADMIN_USERS.md`.

## Deferred engineering cleanup

These are intentionally bookmarked rather than part of the August 9 hardening work:

- **Production server configuration:** stop setting `app.debug = True` and run Flask behind Gunicorn (already in `requirements.txt`) rather than `python app.py`. Keep the convenient development command local to Docker Compose.
- **Automated migration deployment:** add a migration runner/release step when the Render plan or deployment model supports it reliably. The free-tier alpha continues to use the documented manual migration sequence for now.
- **CORS tightening:** configure Flask-Cors from an explicit environment-controlled allowlist instead of calling unrestricted `CORS(app)` and then adding a second header manually.
- **Connection pooling:** the shared transaction helper fixes cleanup and rollback behavior, but the API still opens one PostgreSQL connection per operation. Pooling can wait until usage warrants it.
- **Frontend bundle splitting:** the production build passes but warns that the main JavaScript bundle exceeds 500 kB. Add route-level/dynamic imports before performance becomes a user-visible problem.
- **Broader test coverage and CI:** preserve the current suites and add endpoint/error-path coverage as features change; configure CI when repository/deployment automation is worth maintaining.
- **Dead frontend code and dependency audit:** continue removing unused `web/src/tools`, `trusted-components`, and questionable dependencies on a read-on-demand basis rather than as a risky bulk deletion.

## Key files to know

| Purpose | Path |
|---|---|
| App entry, routing | `web/src/App.tsx`, `web/src/router.tsx` |
| Generic Flask CRUD | `service/src/utils.py` (`add_one`, `get_one`, `get_many`, `update_one`, `return_many`, …) |
| Name hashing (server) | `service/src/hash_name.py` (server salt via `NAME_SALT` env) |
| Name hashing (client) | `web/src/tools/useHashName.ts` (combines name + user salt + organization UUID) |
| Authentication/principal resolution | `service/app.py`, `service/src/auth.py`, `service/src/principal.py` |
| Admin and invitation endpoints | `service/src/admin_views.py`, `service/src/system_admin_views.py`, `service/src/auth_views.py` |
| Production rollout/migrations | `docs/ADMIN_USERS.md`, `service/migrations/` |
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
- **Authentication: Auth0.** Auth0's `sub` remains an external textual identifier in `ombuds.auth0_sub`; all application relationships use local UUIDs. Old commented Keycloak scaffolding is legacy code, not the current plan.
- **Alpha migrations may change the model, but must preserve live alpha data.** Apply production migrations in order and avoid destructive rebuild instructions outside development. See Guiding Principle 1.
- **IOA reporting categories and codes are application-level reference data, not DB rows.** They live in `web/src/constants/ioaConstants.ts`, with deterministic uuid5-derived ids resolved at runtime. A future "Hospital ombuds defaults" or "Government ombuds defaults" pack ships the same way: another constants file with another uuid5 namespace. No "fake organization" rows; no cross-org read exception in the multi-tenancy model.

## Open product questions (resolve before/with the user)

The working decision queue is maintained in `docs/OPEN_DECISIONS.md`.

- Salt-phrase UX: how strongly do we guide ombuds toward a sensible default (per-org? per-ombuds? per-month?) without locking them into one?
- Court-order / legal-hold flow: who can pause purges, how is it audited, and is that audit itself outside the standard purge?

## Submission target

Once functional, submit to IOA for feedback / informal blessing. That means we should be able to walk an IOA reviewer through how each Standard of Practice is honored — confidentiality, independence, neutrality, informality, and especially record-retention practices.
