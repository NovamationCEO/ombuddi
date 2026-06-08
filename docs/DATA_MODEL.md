# Ombuddi — Data Model

> Inferred from `service/src/*_views.py`, generic SQL in `utils.py`, and the typed shapes in `web/src/types/majorTypes.ts`. There is no migration / DDL file checked in (TODO). All `id` columns are UUID based on the `::uuid[]` casts in `get_many_by_ids` and the UUIDs that appear in seed comments.

## Tables

### `organizations`
- `id` UUID, PK
- `name` TEXT

No "well-known" organization rows. The IOA reporting categories and codes are application-level reference data — they live in `web/src/constants/ioaConstants.ts`, never as DB rows. See CONTEXT.md "Settled decisions" for the rationale.

### `ombuds`
- `id` UUID, PK
- `name` TEXT
- `organization_id` UUID, FK -> organizations.id

The "current user" is hard-coded in `web/src/tools/useUserId.ts` as `b73d0105-af49-484f-87a3-217af3feff90`.

### `code_categories`
- `id` UUID, PK
- `organization_id` UUID, FK
- `name` TEXT
- `index` INT (sort order within an org)
- `soft_delete` BOOL (UI hides; rows are never DELETEd by app code)

### `codes`
- `id` UUID, PK
- `organization_id` UUID, FK
- `category_id` UUID, FK -> code_categories.id
- `code` TEXT (e.g. "2F")
- `description` TEXT (e.g. "Bullying, Mobbing")
- `soft_delete` BOOL

Note the typo / bug below — see LESSONS.md, `get_codes_by_category_id` queries `code_category_id` instead of `category_id`.

### `primary_roles`
- `id` UUID, PK
- `organization_id` UUID, FK
- `name` TEXT
- `index` INT
- `soft_delete` BOOL

Org-customizable replacement / extension of the hard-coded role list in `AddPerson.tsx`. The hard-coded list there should eventually be replaced by these rows once seeded. Structurally identical to `picklists` — could be folded in.

### `picklists`
- `id` UUID, PK
- `organization_id` UUID, FK
- `kind` TEXT (e.g. `'medium'`, `'priority'`, `'ombuds_action'`, `'referral_source'`)
- `name` TEXT (the display label, also the value stored on parent rows)
- `index` INT (sort order within an org+kind)
- `soft_delete` BOOL
- Partial unique index on `(organization_id, kind, name) WHERE soft_delete = FALSE`

Generic single-select customizable list. The chosen value gets stored as a TEXT field on the parent row (e.g. `entries.medium = 'In Person'`); renaming a picklist row therefore affects only future selections.

### `cases`
- `id` UUID, PK
- `organization_id` UUID, FK -> organizations.id
- `name` TEXT (often randomized for security)
- `description` TEXT
- `codes` UUID[] (ids of `codes` rows or IOA reference codes; not FK-enforced because Postgres arrays)
- `status` TEXT ('active', etc.; `get_all_cases` filters on `'active'`)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ (auto via trigger)

The `organization_id` column exists; the API does not yet *enforce* that the caller owns the row. Enforcement lands with Phase 4 auth — see `docs/MULTI_TENANCY.md`.

### `entries`
- `id` UUID, PK
- `case_id` UUID, FK -> cases.id
- `ombuds_id` UUID, FK -> ombuds.id
- `organization_id` UUID, FK -> organizations.id  *(denormalized — must match the parent case's org; application code is responsible for the invariant)*
- `date` DATE (the meeting / entry date)
- `medium` TEXT ('inPerson', 'phone', 'video', 'email', 'other')
- `duration` INT (minutes)
- `notes` TEXT
- `codes` UUID[] (action-level tags on this specific entry; issue-level tags live on the parent case's `codes`)

"Entry" is the standardized term across DB, API, UI, and docs. Earlier drafts used "Contact" — retired.

### `persons`
- `id` UUID, PK
- `hashed_name` TEXT (sha256 hex, see hashing pipeline below)
- `gender` TEXT
- `generation` TEXT
- `race` TEXT
- `primary_role` TEXT  (currently a freeform string; should eventually point at `primary_roles.id`)
- `is_international` BOOL
- `category_1`, `category_2`, `category_3` TEXT (freeform tags)
- `organization_id` UUID, FK

### `entry_person` (join table)
Implied by the raw SQL in `person_views.py`:
- `entry_id` UUID, FK -> entries.id
- `person_id` UUID, FK -> persons.id
(Composite PK presumed.)

No API endpoint adds rows here yet — see ROADMAP.md.

## Hashing pipeline

Two layers combined:

1. **Client** (`web/src/tools/useHashName.ts`):
   ```
   sha256( (name + salt + organization.id).trim().toLowerCase().normalize('NFC') )
   ```
2. **Server** (`service/src/hash_name.py`, applied via the `_salt_name` before_request hook and `get_persons_by_hashed_name`):
   ```
   sha256( client_hash + NAME_SALT_env )
   ```

So the column `persons.hashed_name` is `sha256( sha256(name+salt+org_uuid).norm() + SERVER_SALT )`.

Implications:
- The `_salt_name` hook reaches into `request._cached_json`, a Flask internal — fragile, may break on Flask upgrade.
- The organization UUID is immutable; org name is purely decorative.
- The server-side `NAME_SALT` env var must be rotated never (or migrated with a re-hash plan we don't have yet).

## Multi-tenancy

The full plan, gap list, and test scenarios live in `docs/MULTI_TENANCY.md`. Short version:

- Pre-auth lift is **done**: every table has an `organization_id` column (denormalized on `entries` for query simplicity), and `utils.py` helpers now accept an `owner_constraint` parameter that the auth layer will pass through.
- Enforcement is **pending Phase 4** (Keycloak). Until then, endpoints trust the org id supplied in the request body / URL.
