# Ombuddi — Lessons, Patterns, and Gotchas

> Running log. Add to this file whenever a non-obvious shape of the codebase bites or pays off.
>
> **Note:** Items marked **[FIX QUEUED]** are scheduled in ROADMAP.md Phase 0 and don't need defensive coding around them — just fix them when you're touching that area.

## Naming & conventions

- **Wire format is camelCase, DB is snake_case.** The `*_model` dicts in `service/src/*_views.py` map between them (e.g. `{'caseId': 'case_id'}`). When you add a new column, you must add it to the model dict AND the TS type in `web/src/types/majorTypes.ts` or the round-trip silently drops it.
- **Standardized vocabulary:** a Case contains many **Entries**. The word "Contact" used to appear in some product descriptions and UI labels but has been retired — use "Entry" everywhere (DB, API, UI, docs, conversation).
- All table names are plural (`persons`, `entries`, `cases`, etc.). If you find yourself writing a singular table name, you're looking at stale docs or an old comment.
- **IOA codes are application constants, not DB rows.** `web/src/constants/ioaConstants.ts` is the single source of truth; uuid5 ids are derived at module load. Code that needs to detect IOA codes uses `ioaCodeIdSet` / `ioaCodesById`. There is no "IOA organization" row to look up.

## Backend (Flask)

- `service/src/utils.py` does dynamic SQL string interpolation off the `model` dict's values for column names. Those values come from the source code, not from user input, so this is not SQL-injection-prone *as long as* nobody starts feeding user-controlled keys into the model dicts. Don't.
- `add_one` uses raw `f"{model[k]}"` for column names; lowercase fine, but if a new column is added with mixed case or a reserved word, this will need `psycopg2.sql.Identifier`.
- `update_one` uses `COALESCE(%s, existing)` so passing `null` for a field is treated as "leave alone". That means you can never blank a field via update — be aware.
- `person_views.py._salt_name` mutates `request._cached_json` (a Flask private). It works today but is one Flask upgrade away from breaking; prefer building a proper request-body decorator.
- CORS is hard-coded in `service/app.py` to `http://localhost:5173`. Will need to read from env (or use `Flask-Cors` properly) before any non-dev deploy.
- `connection.py` opens a fresh connection per request and sets `autocommit=True`. Fine for low-volume; consider pooling (`psycopg2.pool`) before the first paying customer.
- Soft-delete is implemented as a `soft_delete` BOOL on `codes`, `code_categories`, `primary_roles`. List endpoints filter on `soft_delete: False`. Hard delete endpoints exist in `utils.py` (`remove_one`, `remove_many`) but aren't wired into any blueprint.

## Frontend (Vite + React + MUI + React Query)

- `useGetter<T>([address, param1, param2])` joins its query-key segments with `/` to build the URL and uses them as the React Query cache key. So a key like `['get_case_by_id', undefined]` is correctly disabled (the `enabled` check skips it). Always pass `undefined` rather than `''` for "I don't have it yet."
- `creator`, `updater`, `deleter` are imperative — they do NOT invalidate React Query caches on success. Callers refetch by hand (e.g. `caseRes.refetch()`). When adding new mutations, remember to refetch or wire up `useMutation` + `queryClient.invalidateQueries`.
- The hard-coded `useUserId` returns the same UUID always. Many other components compute the org by chaining `useUserId -> get_ombuds_by_id -> get_organization_by_id`. The two requests run on every page that wants the org. There's an opportunity to centralize this in a `useCurrentUser` once auth lands.
- Keycloak scaffolding is everywhere (commented out) — `App.tsx`, `Page.tsx`, `constants/keycloak.ts`, deps in `package.json`. We can either revive it or rip it out, but the half-state is confusing.
- `useHashName` hashes off `organization.id` (UUID), not name. Don't reintroduce the name into the hash — renames would orphan persons.
- Dependencies were bumped to current major versions in early 2026 (MUI v9, React 19, react-router 7, Vite 8, TypeScript 6). Mapping/stats deps (leaflet, georaster, chroma-js, simple-statistics) were pruned at the same time. Treat any older code patterns (Unstable_Grid2, MUI v5 sx-prop quirks, etc.) as bugs.

## Known bugs / smells

- `cases.codes` is `UUID[]` per `schema.sql`. Both IOA reference codes (uuid5-derived, in code) and org codes (uuid, in DB) are stored as ids in this array; renderers check `ioaCodesById` first, then fall back to `/get_code_by_id`.
- `entry_person` is a composite-PK join with no `id` column, so `utils.py::add_one` doesn't fit. Inline SQL via `_exec_entry_person` in `person_views.py` handles add/remove. POST `/add_entry_person`, DELETE `/remove_entry_person`, both take `{entryId, personId}`.
- `picklists` is the generic table for org-customizable single-select lists. **Kind discriminator strings are an implicit API**: the frontend hard-codes `'medium'`, `'priority'`, etc. in `usePicklists(kind)` calls and `PicklistManager kind=` props. When adding a new picklist kind, grep for those literals and update both sides. The chosen value gets stored as TEXT on the parent row (e.g. `entries.medium = 'In Person'`) — so a rename on the picklist row affects future selections but leaves historic data alone. Acceptable for now; revisit if reports start producing weird buckets from drift.
- `PersonForm` is the reusable form body extracted from `AddPerson` — same fields, hash pipeline, salt-phrase tooltip, and save flow, but parameterized with `initialName`, `onSaved(person)`, `onCancel`. Two consumers: the `/add_person` page route (thin wrapper) and the inline dialog inside `AddEntry`. The page wrapper passes `onSaved={() => null}` and skips `onCancel` — the inline dialog passes both to close itself and stage the new person.
- Stacked MUI dialogs work: AddEntry's PersonForm dialog sits on top of the People dialog with no special z-index handling. Snacks from `useSnack` render globally so they appear above both.
- `/log_without_case` is referenced by `Cases.tsx` but has no route in `router.tsx`. Semantics still TBD — probably "open AddEntry against a hidden per-ombuds catch-all case."

## Security pitfalls to keep top of mind

- Notes are plaintext in the DB today. A breached DB exposes everything the ombuds typed. Encrypting `entries.notes` under a key derived from the user's salt phrase is on the roadmap.
- There is no authentication at all on the API. With CORS off (or behind a reverse proxy), any caller can read all cases. Don't deploy until at minimum a Keycloak/JWT check guards every endpoint and asserts `org_id` ownership.
- The "scramble" only protects the name → person lookup. Demographics, codes, notes, dates, durations, and case names are stored unencrypted under the person's `id`. A breach gives an attacker rich profiles even if they can't link them to a real-world name without the salt phrase.
- A truncation attack on `picsum.photos/seed/{case.id}` leaks case-id existence to a CDN. Not a real privacy hit, but worth noting if anyone asks "do you call out to third parties?" — the answer is currently yes, for the security thumbnails.

## Dev workflow

- Backend: `cd service && docker compose up` brings up Postgres on 5432 and Flask on 5002. Copy `.env.example` to `.env` for required vars.
- Frontend: `cd web && yarn dev` runs Vite at 5173. The `getter`/`creator`/`updater`/`deleter` all key off `window.location.host.includes('localhost')` to swap base URLs.
- DDL source of truth: `service/schema.sql`. Rebuild commands in the header.
- No tests checked in. Vitest is in devDependencies but unused.
- No CI configured.
