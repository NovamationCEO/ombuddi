# Ombuddi — Roadmap to v1 (IOA-submittable)

> Phased plan. The order is "what unblocks the next thing", not strict priority. Confirm scope of each phase with the user before starting work in it. Update the [status] tags as we go.

## Phase 0 — Plumbing, schema redesign, cleanup  [in progress]

Goal: make the codebase safe to build on top of. The live alpha now requires ordered, data-preserving production migrations, while development databases may still be rebuilt freely.

**Tier 1 — trivial cleanups (no design decisions):**

- [x] Fix the `crypto.randomUUID` import in `web/src/components/AddEntry/AddNewCase.tsx`.
- [x] Fix `service/src/ombuddi_views.py::get_codes_by_category_id` — column is `category_id`.
- [x] Delete broken `add_many` in `service/src/utils.py`.
- [x] Remove `web/src/pages/AddEntryBackup copy.tsx`.
- [x] WelcomePage: "Coven" → "Association".

**Tier 2 — small additions:**

- [x] `service/.env.example` with placeholder values.
- [x] `service/schema.sql` as the DDL source of truth.
- [x] `/add_case` route. `/log_without_case` still TBD — see note in LESSONS.md.

**Tier 3 — schema and identity redesign (the "pre-production freedom" cluster):**

- [x] Rename DB table `person` → `persons` (and the table-name string in `person_views.py`). Wipe + recreate dev DB.
- [x] Switch hashing input from `organization.name` to `organization.id`.
- [x] Retire the "IOA organization" sentinel; IOA codes are application constants now. See `web/src/constants/ioaConstants.ts` and `web/src/tools/useCodeSource.ts`.
- [ ] Remove obsolete commented-out Keycloak scaffolding when touching the affected frontend files; Auth0 is the active identity provider.
- [ ] Strip dead utilities from `web/src/tools/` and `trusted-components/` on a read-on-demand basis.

**Tier 4 — dependency upgrades:**

- [x] MUI → v9, React → 19, react-router → 7, Vite → 8, TypeScript → 6, Zustand → 5, etc. Done out-of-band.
- [x] Pruned mapping/stats deps (leaflet, georaster, chroma-js, simple-statistics, etc.) at the same time.
- [x] Added `uuid` runtime dep for `ioaConstants.ts` uuid5 derivation. Run `cd web && npm install` after dependency changes.
- [ ] Still-questionable deps to audit on demand: `html-to-image`, `jsdom`, `patch-package`, `@dnd-kit/*` (only used in `trusted-components/Sortable*`, which is untouched).

**Tier 5 — multi-tenancy plan (implementation lands with Phase 4 auth):**

- [x] Pre-auth lift complete: `organization_id NOT NULL` on `cases` and `entries`; `owner_constraint` parameter on `utils.py` helpers (default `None`); create-payload sources wired up on the frontend; `update_one` returns 404 when owner-scoped and zero rows match.
- [x] Auth0 principal resolution and per-view tenant enforcement. Auth0 `sub` stays separate from local ombuds UUIDs; database constraints/triggers protect cross-tenant relationships.

**Tier 6 — August 9, 2026 hardening:**

- [x] Redact database/token-verification details from API responses while retaining server-side exception logs.
- [x] Centralize routine transaction cleanup, preserve provider database DSNs intact, and cover connection failures with tests.
- [x] Remove tracked Python bytecode and obsolete duplicate backend utilities.
- [x] Standardize frontend dependency management on npm and remove checked-in Yarn runtime files.
- [ ] Deferred production/runtime cleanup is recorded in `docs/CONTEXT.md` under **Deferred engineering cleanup**.

The full plan, endpoint-by-endpoint gap list, and test scenarios live in `docs/MULTI_TENANCY.md`.

## Phase 1 — Entry flow complete  [done]

Goal: an ombuds can fully log a meeting and associate people with it.

- [x] `entry_person` API: `POST /add_entry_person`, `DELETE /remove_entry_person`, both `{entryId, personId}`. `get_persons_by_entry_id` and `get_persons_by_case_id` already existed.
- [x] AddEntry "People" dialog: staged people persist on entry save (fans out one `add_entry_person` per staged person after the entry is created).
- [x] PersonFinder: `onSelect` callback wired up. Search clears after a successful pick so the dialog stays usable.
- [x] AddEntry dialog left panel lists people already on the case (via `get_persons_by_case_id`), filtered to those not yet staged; click to add.
- [x] CaseSummary: highlighted entry now shows associated people as chips below notes.
- [x] Inline-dialog "Create new user": PersonFinder's `onCreateRequest` fires with the typed name; AddEntry mounts `PersonForm` in a stacked Dialog pre-filled with that name. On save, the new person is staged immediately. The `/add_person` route still works as a fallback when PersonFinder is used outside AddEntry.
- [x] Tags on entries (decision: allowed). `entries.codes UUID[]` mirrors `cases.codes`. Same CodeSetterBox picker pattern as AddNewCase (IOA + org). CaseSummary shows the highlighted entry's tags as CodeChips above the People list. Issue-level tagging stays on the case; action-level tagging (e.g. "intake", "mediation") happens on the entry.
- [x] Org-customizable entry `medium` and `priority`. Went with the **generic `picklists` table** keyed by `kind` so future list types (ombuds_action, referral_source, case_contact, risk_level, …) ship as configuration rather than schema changes. `usePicklists(kind)` hook + `PicklistManager` component on the Organization page handle CRUD + reorder. `primary_roles` stays separate for now; it could be folded into picklists later.

## Phase 2 — Persons & visitors hardening  [done]

Goal: respect IOA confidentiality on identity.

- [x] Org name is decorative — hashing keys off `organization.id` (UUID), so renames never orphan persons. No lock needed. `PUT /api/v1/update_organization` added; Organization page Save button wired up.
- [x] Public Persons: `is_public` BOOL + `public_name` TEXT on `persons` (hashed_name now nullable). `GET /api/v1/get_public_persons_by_organization_id` + `DELETE /api/v1/delete_person` added. PublicPersons component on Organization page with add/edit/delete.
- [x] AddPerson security UX: tooltip replaced with a right-side Drawer ("Salt Phrase Guide") covering all six strategies — organizational, personal, time-based, per-case, scrambled spelling, blank.
- [ ] PersonFinder result rendering: show enough demographic differentiation when multiple matches share a salt+name (rare but possible across orgs). *(deferred — low priority until multiple-match scenarios arise in practice)*
- [x] Encrypt `entries.notes` at rest. Client-side AES-256-GCM via WebCrypto; key derived from PBKDF2(saltPhrase, orgId). Session salt entered once at app load (pre-fills PersonForm + PersonFinder salt fields). Per-entry override supported. CaseSummary decrypts on display; shows inline salt-override prompt on key mismatch. Format: `ombuddi_enc_v1:<base64(iv+ciphertext)>`; legacy plaintext detected and passed through.
- [x] Org-customizable demographic picklists (gender, generation, race). `DemographicPicker` component in `PersonForm` renders each as a dynamic radio list with a free-text "Other…" option at the end. Custom values stored as plain text on the person row; remain readable if the org later adds that value to the list.
- [x] Picklist descriptions / tooltips. `description TEXT NOT NULL DEFAULT ''` added to `picklists` table. Edit dialog in `PicklistManager` now has a second "Tooltip / description" field; description shown inline in italic beneath the option name in the manager, and as a MUI Tooltip when hovering in `DemographicPicker`. Generation options ship with birth-year descriptions.
- [x] `PicklistManager` preset loader. `defaultSets` prop accepts named preset packs (`DefaultSet[]`). "Load defaults" button appears when the list is empty, opens a picker dialog showing available sets with item preview, and loads the chosen set sequentially. All five Organization-page picklist kinds (medium, priority, gender, generation, race) ship with a Standard preset. Dev seed pre-populates all five for the dev org.

## Phase 3 — Reports  [in progress]

Goal: aggregate trend reports that an org leader can act on, with no identity leakage.

- [x] Initial report UI under `/report` with date range, trend/category charts, bar/pie toggles, and offline export support.
- [ ] Add report filters for code, code category, primary role, demographic axis, medium, and ombuds.
- [x] Backend report aggregation endpoint using tenant-scoped `GROUP BY` queries across entries, cases, codes, and persons.
- [x] **Dual-mode rendering toggle** (see CONTEXT.md "Settled decisions"):
  - *Full mode* — every bucket as-is. Ombuds-only, not exportable, no share affordance in the UI.
  - *Shareable mode* — enforce minimum cell size (default 5, org-configurable). Below-threshold buckets merge into "Other" or are suppressed. Exports and external-sharing flows are gated to this mode.
  - The toggle is visually distinguished with lock/share icons and a mode banner.
- [ ] Disable export actions while in Full mode so only the suppression-enforced Shareable view can leave the application.
- [x] Highcharts chart layer with browser-local/offline export modules.
- [ ] Export: PDF + .docx via the user's "skills" pipeline so the ombuds can drop a yearly summary into a memo.
- [ ] Stretch: year-over-year comparisons and "topic spike" alerts.

## Phase 4 — Authentication & multi-tenancy  [in progress]

Goal: keep org A from ever seeing org B's data.

- [x] Auth approach: **Auth0**. Flask validates access-token issuer, audience, and signature, then resolves the token `sub` through the local `ombuds.auth0_sub` column.
- [x] Flask derives local ombuds and organization UUIDs from the linked database row and enforces tenant ownership. Client-supplied identity/organization values are not authoritative.
- [x] Centralized ownership constraints in shared CRUD paths plus tenant-aware database foreign keys/triggers for cross-table relationships.
- [x] Resolve Auth0 `sub` through `ombuds.auth0_sub`; keep local UUIDs server-side and expose principal-scoped current-user/current-organization endpoints.
- [ ] Replace the current overlapping CORS mechanisms with one environment-controlled origin allowlist.

## Phase 5 — Record retention & purge  [not started]

Goal: deliver on the IOA standard that makes Ombuddi different from generic record systems.

- [ ] Per-org retention policy: number of days for entries, cases, persons. Defaults per IOA guidance (the user will set the canonical defaults — likely 30–90 days for entries, longer for cases).
- [ ] Background job (cron in container, or APScheduler) that nightly purges rows whose `updated_at + retention_days < now()`.
- [ ] "Refresh" buttons in the UI: touching an entry, case, or person bumps `updated_at` so it stays alive another retention cycle.
- [ ] Per-case override: option to tie all entries' lifespan to the case's (so the case being touched keeps everything alive).
- [ ] Manual remove buttons on entries, persons, cases.
- [ ] "Clear all my records" nuclear option, gated behind re-entry of the salt phrase.
- [ ] Legal hold flag at the org level: when set, the purge job logs a row but does not delete. An audit table records who set the hold and when. Audit rows themselves are excluded from purge.
- [ ] Telemetry / a soft warning when retention is set absurdly long (> 1 year), since "permanent records" is exactly what IOA says we shouldn't have.

## Phase 6 — Subscription, billing, onboarding  [not started]

Goal: actually take money.

- [ ] Stripe (most likely). Per-seat per-month, per-org subscription.
- [x] Alpha org-admin foundation: local `is_admin`, user-seat creation, one-time invitation links, and Auth0 subject claiming. Billing remains future work.
- [ ] Self-serve org creation flow.
- [ ] First-run wizard: pick defaults (retention windows, primary roles, code categories — pre-seed IOA codes for them).
- [ ] Email / support flow that does NOT depend on Ombuddi staff seeing user data.

## Phase 7 — IOA submission readiness  [not started]

Goal: a story you can walk the IOA through.

- [ ] A "How Ombuddi maps to IOA Standards" doc (`docs/IOA_ALIGNMENT.md`) — point-by-point on confidentiality, independence, informality, neutrality, record retention.
- [ ] Third-party security review (even an informal one) of the hashing pipeline.
- [ ] Privacy policy and a written commitment never to grant Ombuddi staff access to plaintext visitor data.
- [ ] Walkthrough video / screencast.

## Phase 8 — Nice-to-haves  [parking lot]

- Org structure modeling beyond `primary_roles` (departments, hierarchies, custom tags).
- Calendar import for meeting dates/durations.
- Multi-ombuds case handoff with re-hashing under the recipient's salt.
- "Practice mode" sandbox seeded with fake cases for training.
- Mobile-friendly responsive pass (most pages have it, AddEntry / AddNewCase don't yet).
- Theme toggle (the dark theme code is already there, just commented out in `Header.tsx`).
- Internationalization (IOA is, after all, international).
