# Ombuddi — Data Model

> Inferred from `service/src/*_views.py`, generic SQL in `utils.py`, and the typed shapes in `web/src/types/majorTypes.ts`. There is no migration / DDL file checked in (TODO). All `id` columns are UUID based on the `::uuid[]` casts in `get_many_by_ids` and the UUIDs that appear in seed comments.

## Tables

### `organizations`
- `id` UUID, PK
- `name` TEXT

Two "well-known" organizations live in the DB today:
- `628b5737-43e6-49c7-a632-2f723a455e59` — IOA (holds the shared IOA reporting categories/codes)
- `ac314522-27f8-42e1-8bd5-6ff68d6b3e9d` — appears in seed comments ("Supernatural", "Sandwiches" categories), looks like a dev/test org.

The IOA org id is hard-coded in `web/src/tools/useIoaOrgId.ts`. Real customers will need to be onboarded as additional rows.

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

Org-customizable replacement / extension of the hard-coded role list in `AddPerson.tsx`. The hard-coded list there should eventually be replaced by these rows once seeded.

### `cases`
- `id` UUID, PK
- `name` TEXT (often randomized for security)
- `description` TEXT
- `codes` TEXT[] (UUIDs of `codes.id`, stored as a Postgres array — see `EditCodeDialog.save()` which sends `codes: string[]`)
- `status` TEXT ('active', etc.; `get_all_cases` filters on `'active'`)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

No `organization_id` column is referenced in the case model, but cases are per-org by transitivity through the logged-in ombuds. **This is a multi-tenancy hole**: `get_all_cases` has no org filter — any caller gets every active case in the DB. Fix when auth lands.

### `entries`
- `id` UUID, PK
- `case_id` UUID, FK
- `ombuds_id` UUID, FK
- `date` DATE (the meeting / entry date)
- `medium` TEXT ('inPerson', 'phone', 'video', 'email', 'other')
- `duration` INT (minutes)
- `notes` TEXT

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

## Multi-tenancy gaps (must fix before real users)

- `get_all_cases` — no org/ombuds filter.
- `get_case_by_id`, `get_entries_by_case_id`, `get_entry_by_id` — no ownership check.
- `update_case`, `update_entry`, `update_code`, `update_code_category`, `update_primary_role` — no ownership check.
- `get_codes_by_organization_id` is parameterized but trusts the URL.
- `persons` is filtered by `organization_id` on the list endpoint, but `get_person_by_id` is not.

Every endpoint needs to be wrapped in: "the calling principal is an ombuds whose `organization_id` matches the target row's." That happens at the same time as real auth.
