# Ombuddi — Data Model

> The canonical DDL is `service/schema.sql`; ordered production changes live in `service/migrations/`. View-model mappings in `service/src/*_views.py` and TypeScript shapes in `web/src/types/majorTypes.ts` must remain aligned with it.

## Tables

### `organizations`
- `id` UUID, PK
- `name` TEXT

No "well-known" organization rows. The IOA reporting categories and codes are application-level reference data — they live in `web/src/constants/ioaConstants.ts`, never as DB rows. See CONTEXT.md "Settled decisions" for the rationale.

### `ombuds`
- `id` UUID, PK
- `auth0_sub` TEXT, unique, nullable until an invited seat is linked to Auth0
- `email` TEXT, optional invitation/contact address
- `is_admin` BOOL, organization-level user-management permission
- `is_system_admin` BOOL, Ombuddi system-administration permission
- `is_active`, `deactivated_at`, reversible seat status
- `name` TEXT
- `person_avatar_style` TEXT (`monster` by default, or the user's neutral `geometric` preference)
- `organization_id` UUID, FK -> organizations.id

Auth0's textual `sub` claim is an external identity only. Authentication
middleware resolves it through `ombuds.auth0_sub`, then uses the row's local
UUID `id` for relationships and its `organization_id` for ownership checks.

### `ombuds_invitations`
- `id` UUID, PK
- `ombuds_id` UUID, FK -> ombuds.id
- `token_hash` TEXT, unique SHA-256 hash (the raw token is never stored)
- `created_by_ombuds_id` UUID, FK -> ombuds.id
- `created_at`, `expires_at` TIMESTAMPTZ
- `invited_email` normalized target email captured when the invitation is issued
- `claimed_at`, `revoked_at` nullable TIMESTAMPTZ
- `claimed_by_auth0_sub` TEXT
- `claimed_by_email` verified Auth0 email recorded when claimed

An administrator creates an unlinked seat, generates a seven-day invitation,
and shares the one-time URL. Claiming it atomically connects the authenticated
Auth0 subject to the existing local ombuds UUID.

### `administrative_events`
- immutable append-only audit rows for organization, seat, role, status, email,
  and invitation lifecycle actions;
- actor, organization, optional target seat, event type, reason, structured
  non-secret details, and timestamp;
- raw invitation tokens and visitor/case content are never recorded.

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
- `case_kind` TEXT (`standard` or the system-managed `general` container)
- `owner_ombuds_id` UUID, required only for General activity
- `created_by_ombuds_id` UUID, immutable creator provenance; not report membership
- `name` TEXT (often randomized for security)
- `description` TEXT
- `codes` UUID[] (ids of `codes` rows or IOA reference codes; not FK-enforced because Postgres arrays)
- `status` TEXT ('active', etc.; `get_all_cases` filters on `'active'`)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ (auto via trigger)

Tenant ownership is enforced by the API and composite database relationships. Standard cases are collaborative within the organization. Each ombuds has an owner-only General container, which cannot carry case codes or referral sources.

### `entries`
- `id` UUID, PK
- `case_id` UUID, FK -> cases.id
- `ombuds_id` UUID, FK -> ombuds.id
- `organization_id` UUID, FK -> organizations.id  *(denormalized; composite foreign keys require it to match both the parent case and ombuds seat)*
- `date` DATE (the meeting / entry date)
- `medium` TEXT ('inPerson', 'phone', 'video', 'email', 'other')
- `duration` INT (nonnegative whole minutes)
- `notes` TEXT (client-side encrypted when nonempty; unchanged legacy plaintext may remain readable but edits require encryption)
- `codes` UUID[] (action-level tags on this specific entry; issue-level tags live on the parent case's `codes`)

"Entry" is the standardized term across DB, API, UI, and docs. Earlier drafts used "Contact" — retired.
Entries are attributed to their author. Colleagues can view entries on shared standard cases, but only the author may edit an entry or change its person links.

### `persons`
- `id` UUID, PK
- `hashed_name` TEXT (sha256 hex, see hashing pipeline below)
- `monster_seed` UUID (random, non-identifying seed for the person's stable procedural portrait)
- `monster_version` SMALLINT (freezes the portrait renderer version; currently `1`)
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

- Auth0 authentication and principal resolution are implemented. Every authenticated request resolves `ombuds.auth0_sub` to local ombuds and organization UUIDs before protected view code runs.
- API queries use principal-derived ownership constraints, inserts force-stamp ownership, and database relationships/triggers reject cross-tenant associations. Request bodies and organization IDs in URLs are never treated as authority.
