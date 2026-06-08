# Ombuddi — Roadmap to v1 (IOA-submittable)

> Phased plan. The order is "what unblocks the next thing", not strict priority. Confirm scope of each phase with the user before starting work in it. Update the [status] tags as we go.

## Phase 0 — Plumbing, schema redesign, cleanup  [in progress]

Goal: make the codebase safe to build on top of. Since the app has no real users yet (Principle 1), we use this phase aggressively — anything that would normally be a migration nightmare is just a code edit now.

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
- [ ] Decide whether to fully revive the commented-out Keycloak scaffolding now (deferred to Phase 4).
- [ ] Strip dead utilities from `web/src/tools/` and `trusted-components/` on a read-on-demand basis.

**Tier 4 — dependency upgrades:**

- [x] MUI → v9, React → 19, react-router → 7, Vite → 8, TypeScript → 6, Zustand → 5, etc. Done out-of-band.
- [x] Pruned mapping/stats deps (leaflet, georaster, chroma-js, simple-statistics, etc.) at the same time.
- [ ] Added `uuid` runtime dep for `ioaConstants.ts` uuid5 derivation. **Run `cd web && yarn install` to pick this up.**
- [ ] Still-questionable deps to audit on demand: `html-to-image`, `jsdom`, `patch-package`, `@dnd-kit/*` (only used in `trusted-components/Sortable*`, which is untouched).

**Tier 5 — multi-tenancy plan (implementation lands with Phase 4 auth):**

- [x] Pre-auth lift complete: `organization_id NOT NULL` on `cases` and `entries`; `owner_constraint` parameter on `utils.py` helpers (default `None`); create-payload sources wired up on the frontend; `update_one` returns 404 when owner-scoped and zero rows match.
- [ ] Enforcement pending Phase 4: `Principal` decoder, `@requires_principal` decorator, per-view adoption.

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

## Phase 2 — Persons & visitors hardening  [not started]

Goal: respect IOA confidentiality on identity.

- [ ] Lock organization name once any persons exist (or migrate hashing to org id — see LESSONS.md). Add a guard in `update_organization` (endpoint doesn't exist yet — add it).
- [ ] Public Persons: add `is_public` BOOL to `person`; UI tab in Organization page for managing them; expose unhashed name field on those rows only.
- [ ] AddPerson security UX: explain the salt-phrase choices the user already wants surfaced (per-org, per-ombuds, per-month, per-case, blank, scrambled-spelling). The big tooltip already drafted is a good starting point; make it a side-panel modal instead.
- [ ] PersonFinder result rendering: show enough demographic differentiation when multiple matches share a salt+name (rare but possible across orgs).
- [ ] Decide: encrypt `entries.notes` at rest with a key derived from the ombuds' salt phrase. If yes, this changes everything downstream — design before implementing.

## Phase 3 — Reports  [not started]

Goal: aggregate trend reports that an org leader can act on, with no identity leakage.

- [ ] Report builder UI under `/report`. Filters: date range, code, code category, primary role, demographic axis, medium, ombuds.
- [ ] Backend report endpoints. Use `GROUP BY` queries on `entries`, `cases.codes`, `persons` (joined through `entry_person`). Return raw bucketed counts plus computed shares.
- [ ] **Dual-mode rendering toggle** (see CONTEXT.md "Settled decisions"):
  - *Full mode* — every bucket as-is. Ombuds-only, not exportable, no share affordance in the UI.
  - *Shareable mode* — enforce minimum cell size (default 5, org-configurable). Below-threshold buckets merge into "Other" or are suppressed. Exports and external-sharing flows are gated to this mode.
  - The toggle should be visually unambiguous; a small lock icon on Full mode plus a "Ombuds eyes only" banner is a good starting point.
- [ ] Highcharts is already in deps — use it for the chart layer.
- [ ] Export: PDF + .docx via the user's "skills" pipeline so the ombuds can drop a yearly summary into a memo.
- [ ] Stretch: year-over-year comparisons and "topic spike" alerts.

## Phase 4 — Authentication & multi-tenancy  [not started]

Goal: keep org A from ever seeing org B's data.

- [ ] Auth approach: **Keycloak** (decided — see CONTEXT.md "Settled decisions"). Self-hosted in the same docker-compose stack as Postgres and the Flask app.
  - Add a `keycloak` service to `service/docker-compose.yml`.
  - Revive `web/src/constants/keycloak.ts` and the `ReactKeycloakProvider` in `App.tsx` / route guards in `Page.tsx`.
  - Flask side: validate the access token's `iss`, `aud`, signature against Keycloak's JWKS on every request; derive `organization_id` and `ombuds_id` from the token claims.
- [ ] Every Flask endpoint must derive the calling ombuds' `organization_id` from the token and enforce it as a WHERE constraint. Stop trusting `<organization_id>` URL params.
- [ ] Centralize ownership checks. Convert generic CRUD helpers to take an `owner_org_id` constraint that gets ANDed in. Or write per-entity handler classes.
- [ ] Replace `useUserId.ts` and `useOrganization.ts` with the JWT-derived identity.
- [ ] CORS: read allowed origins from env.

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
- [ ] Org-admin role distinct from ombuds (creates the org, adds seats, billing).
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
