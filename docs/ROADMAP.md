# Ombuddi — Roadmap to v1 (IOA-submittable)

> Phased plan. The order is "what unblocks the next thing", not strict priority. Confirm scope of each phase with the user before starting work in it. Update the [status] tags as we go.

## Phase 0 — Plumbing & cleanup  [not started]

Goal: make the codebase safe to build on top of.

- [ ] Check in a `service/schema.sql` (or first Alembic migration) reflecting the current tables. Source of truth so far is the views + this repo's `DATA_MODEL.md` — write the DDL once, commit it.
- [ ] Add `service/.env.example` and document required vars (`DB_*`, `NAME_SALT` aka `SALT`).
- [ ] Fix the `crypto.randomUUID` import in `web/src/components/AddEntry/AddNewCase.tsx` (use `uuid` from npm or `window.crypto.randomUUID()`).
- [ ] Fix `service/src/ombuddi_views.py::get_codes_by_category_id` — column is `category_id`, not `code_category_id`.
- [ ] Either delete or fix `service/src/utils.py::add_many` (currently `NameError` on `sql.Identifier`).
- [ ] Remove `web/src/pages/AddEntryBackup copy.tsx` once confirmed obsolete.
- [ ] Define the two missing routes from `Cases.tsx`: `/add_case` (point at `AddNewCase`) and `/log_without_case` (TBD: probably "open the AddEntry form with a hidden catch-all case").
- [ ] Decide: revive keycloak scaffolding or rip it out for now (recommend: rip out, add real auth in Phase 4).

## Phase 1 — Contact (entry) flow complete  [not started]

Goal: an ombuds can fully log a meeting and associate people with it.

- [ ] `entry_person` API:
  - [ ] `POST /api/v1/add_entry_person` ({entryId, personId})
  - [ ] `DELETE /api/v1/remove_entry_person`
  - [ ] use existing `get_persons_by_entry_id`
- [ ] AddEntry "People" dialog: persist selected people on save (currently no-op).
- [ ] PersonFinder: wire the "Select" button to add a found person to the staged list; wire the "Create new user" branch to a smaller AddPerson flow that returns the new id.
- [ ] Show people currently on a case in the left panel of the AddEntry people dialog (the box that already says "Associated with Case" — pull from `get_persons_by_case_id`).
- [ ] CaseSummary: surface people on the highlighted entry alongside notes/duration.
- [ ] Decide: tags on entries (separate `entry_codes`?) or rely on case-level codes only. Implement chosen path.
- [ ] Org-customizable contact `medium` list and `priority` list. New tables `mediums` and `priorities` with the same `id/organization_id/name/index/soft_delete` shape as `primary_roles`, or a single `picklists` table keyed by `kind`.

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
- [ ] Backend report endpoints. Use `GROUP BY` queries on `entries`, `cases.codes`, `person` (joined through `entry_person`). Return raw bucketed counts plus computed shares.
- [ ] **Minimum cell size**: suppress (or merge into "Other") any bucket smaller than N (start at 5; org-configurable). This is the single most important confidentiality feature in reporting.
- [ ] Highcharts is already in deps — use it for the chart layer.
- [ ] Export: PDF + .docx via the user's "skills" pipeline so the ombuds can drop a yearly summary into a memo.
- [ ] Stretch: year-over-year comparisons and "topic spike" alerts.

## Phase 4 — Authentication & multi-tenancy  [not started]

Goal: keep org A from ever seeing org B's data.

- [ ] Pick an auth approach. Options:
  1. Revive Keycloak (already scaffolded — feels heavy for a SaaS launch but flexible).
  2. Auth0 / Clerk / WorkOS — fastest path to SSO for enterprise customers.
  3. Roll our own JWT on top of Flask-Login — cheapest, most maintenance.
  Recommendation: option 2 for v1 to unblock IOA submission and pilot customers.
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
