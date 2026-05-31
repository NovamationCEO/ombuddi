# Ombuddi — Lessons, Patterns, and Gotchas

> Running log. Add to this file whenever a non-obvious shape of the codebase bites or pays off.
>
> **Note:** Items marked **[FIX QUEUED]** are scheduled in ROADMAP.md Phase 0 and don't need defensive coding around them — just fix them when you're touching that area.

## Naming & conventions

- **Wire format is camelCase, DB is snake_case.** The `*_model` dicts in `service/src/*_views.py` map between them (e.g. `{'caseId': 'case_id'}`). When you add a new column, you must add it to the model dict AND the TS type in `web/src/types/majorTypes.ts` or the round-trip silently drops it.
- **"Entry" (code) == "Contact" (product).** Don't rename without doing both sides. The user uses "Contact" in conversation; the schema/UI mostly say "Entry".
- **`person` is singular**, while `entries`, `cases`, `organizations`, `codes`, `code_categories`, `primary_roles` are plural. **[FIX QUEUED]** Rename to `persons` in Phase 0; no production data to migrate.

## Backend (Flask)

- `service/src/utils.py` does dynamic SQL string interpolation off the `model` dict's values for column names. Those values come from the source code, not from user input, so this is not SQL-injection-prone *as long as* nobody starts feeding user-controlled keys into the model dicts. Don't.
- `add_many` in `utils.py` references `sql.Identifier(...)` but never imports `sql` from `psycopg2`. **It is broken** — first call will `NameError`. Not used by any endpoint currently. Either fix or delete.
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
- `useHashName` includes `organization.name` (not id) in the hash. **[FIX QUEUED]** Switching to `organization.id` in Phase 0. Org name becomes decorative.
- MUI's `Grid2` is imported from `@mui/material/Unstable_Grid2`. That'll move when MUI v6 lands; track for upgrade.
- `randomUUID` is imported from `crypto` (Node) in `AddNewCase.tsx`. In the browser this should be `crypto.randomUUID()` off `window.crypto`, or `uuid` from npm. Likely throws at runtime. **[FIX QUEUED]**

## Known bugs / smells

- `get_codes_by_category_id` queries `code_category_id` but the column is `category_id`. **[FIX QUEUED]**
- `caseRes.data?.codes` is treated as a string array in TS, but the SQL `codes` column type is undocumented. Confirm it's `text[]` (or `uuid[]`) in DDL; if it's TEXT (comma-separated), the array operations will silently break.
- `PersonFinder` calls the `Select` button but doesn't wire it up. The "Add Person to Entry" save likewise does nothing. The path "person picked in dialog → attached to the entry on save" is unimplemented.
- `Cases.tsx` links to `/add_case` and `/log_without_case`, neither of which is in `router.tsx`. Click leads to 404.
- `AddEntry.tsx` exists as both `AddEntry.tsx` (current) and `AddEntryBackup copy.tsx` (stale). **[FIX QUEUED]** Delete.
- `WelcomePage.tsx` says "International Ombuds **Coven**" — typo for "Association". **[FIX QUEUED]**

## Security pitfalls to keep top of mind

- Notes are plaintext in the DB today. A breached DB exposes everything the ombuds typed. Encrypting `entries.notes` under a key derived from the user's salt phrase is on the roadmap.
- There is no authentication at all on the API. With CORS off (or behind a reverse proxy), any caller can read all cases. Don't deploy until at minimum a Keycloak/JWT check guards every endpoint and asserts `org_id` ownership.
- The "scramble" only protects the name → person lookup. Demographics, codes, notes, dates, durations, and case names are stored unencrypted under the person's `id`. A breach gives an attacker rich profiles even if they can't link them to a real-world name without the salt phrase.
- A truncation attack on `picsum.photos/seed/{case.id}` leaks case-id existence to a CDN. Not a real privacy hit, but worth noting if anyone asks "do you call out to third parties?" — the answer is currently yes, for the security thumbnails.

## Dev workflow

- Backend: `cd service && docker compose up` brings up Postgres on 5432 and Flask on 5002. `.env` provides `DB_USER`, `DB_PASS`, `DB_NAME`, `SALT`. There is no `.env.example` checked in — add one for new contributors.
- Frontend: `cd web && yarn dev` runs Vite at 5173. The `getter`/`creator`/`updater`/`deleter` all key off `window.location.host.includes('localhost')` to swap base URLs.
- No tests checked in. Vitest is in devDependencies but unused.
- No CI configured.
- No DDL / migrations committed. Whoever runs the DB locally needs to know the schema — currently only by reading the views. Adding an Alembic migration or a `schema.sql` is a near-term must.
