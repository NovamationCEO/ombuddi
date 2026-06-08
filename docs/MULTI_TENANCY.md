# Ombuddi — Multi-Tenancy Plan

> Planning doc, not a spec. Updated as decisions land. The implementation lands with Phase 4 (Keycloak auth); the *column* additions can land sooner under Principle 1 (pre-production freedom).

## The principle

Every row in the database is owned by exactly one organization. Every read, write, update, or delete must demonstrably match the calling principal's `organization_id`. URL parameters and request bodies are **inputs, never authority** — the only authority is the verified auth token.

Stated as a rule the codebase enforces: *no query is allowed without an `organization_id` predicate derived from the token.* There are no legitimate cross-org reads in the data model — IOA reference codes live in code, not in the DB (see CONTEXT.md "Settled decisions").

## The principal

Once Keycloak is wired in, every request resolves to a `Principal` constructed by middleware. Proposed shape:

```python
@dataclass(frozen=True)
class Principal:
    ombuds_id: UUID          # from token sub, mapped to ombuds.id
    organization_id: UUID    # derived from ombuds.organization_id at login,
                             # or carried as a token claim and re-validated
    roles: frozenset[str]    # e.g. {"ombuds"}, {"ombuds", "org_admin"}
```

Middleware contract: if the token is missing, expired, or its `sub` doesn't map to an active ombuds row, the request gets `401` before touching a view. Views never see an unauthenticated request.

For the moment, `useUserId.ts` returns a hard-coded UUID and there is no server-side check at all. That's the current debt this plan retires.

## Current gaps — endpoint by endpoint

Sourced from `service/src/ombuddi_views.py` and `service/src/person_views.py`. "Owner check" means: does the query AND in an `organization_id` predicate that came from the principal (not the URL)?

| Endpoint | Owner check today | Notes |
|---|---|---|
| `GET /get_all_cases` | None | Returns every active case in every org. The single worst leak. |
| `GET /get_case_by_id/<id>` | None | Anyone can read any case by guessing/leaking a UUID. |
| `POST /create_case` | None | No org_id on cases at all today. |
| `PUT /update_case` | None | Same. |
| `GET /get_organization_by_id/<id>` | None | Currently used to fetch the *caller's* org name only; once auth lands, drop the parameter and just return the principal's org. |
| `GET /get_ombuds_by_id/<id>` | None | Same — drop the parameter, return the principal's ombuds row. |
| `GET /get_code_categories_by_organization_id/<id>` | URL only | Must match principal.org_id. |
| `POST /add_code_category` | None | Body says org_id; verify it matches principal. |
| `PUT /update_code_category` | None | Verify the target row's org_id matches principal. |
| `GET /get_codes_by_category_id/<id>` | None | Join through `code_categories.organization_id`; match principal. |
| `GET /get_codes_by_organization_id/<id>` | URL only | Match principal. |
| `POST /add_code`, `PUT /update_code` | None | Verify org_id matches principal. |
| `GET /get_code_by_id/<id>` | None | Verify org of the row matches principal. |
| `GET /get_all_codes_by_organization_id/<id>` | URL only | (Note: this duplicates `get_codes_by_organization_id` minus the soft_delete filter; consider collapsing.) |
| `GET /get_primary_roles_by_organization_id/<id>` | URL only | Match principal. |
| `POST /add_primary_role`, `PUT /update_primary_role`, `GET /get_primary_role_by_id/<id>`, `GET /get_all_primary_roles_by_organization_id/<id>` | None / URL only | All match principal. |
| `GET /get_entry_by_id/<id>` | None | Join through `entries.case_id → cases.organization_id` (or add `entries.organization_id` directly — see Schema Changes). |
| `POST /add_entry` | None | Verify the target `case_id` belongs to principal.org. |
| `GET /get_entries_by_case_id/<case_id>` | None | Verify the case belongs to principal.org before returning entries. |
| `PUT /update_entry` | None | Verify the row's org via case_id. |
| `GET /get_person_by_id/<person_id>` | None | Match `persons.organization_id` to principal. |
| `GET /get_persons_by_hashed_name/<hash>` | None | Match `persons.organization_id` to principal. The hash already includes the org UUID, so a cross-org collision is mathematically vanishing — but defense in depth: enforce the org filter anyway. |
| `POST /add_person`, `PUT /update_person` | None | Match `organization_id` from body to principal. |
| `GET /get_persons_by_organization_id/<id>` | URL only | Match principal. |
| `GET /get_persons_by_case_id/<case_id>` | None | Verify case belongs to principal.org. |
| `GET /get_persons_by_entry_id/<entry_id>` | None | Verify entry's case belongs to principal.org. |

## Schema changes the plan requires

1. **`cases.organization_id UUID NOT NULL`** (FK to organizations). Today, cases have no org column at all and inherit org by transitivity through the entries' ombuds. That's not enforceable. Add the column; populate at case-create time from the principal.
2. **`entries.organization_id UUID NOT NULL`** (FK to organizations). Strictly speaking redundant with `cases.organization_id`, but it lets every `entries`-touching query AND in the org constraint without a join. The redundancy is worth it for query simplicity and for the `utils.py` generic helpers, which don't currently support joins.
3. **No changes to `persons`, `codes`, `code_categories`, `primary_roles`, `ombuds`** — they already carry `organization_id`.
4. **`entry_person`** — pure join table, no org column needed; ownership is verified via the parent `entries` row.

Both column additions are pre-production-safe (Principle 1). They can land *before* auth — the columns just won't be enforced as a filter until then.

## The wrapper approach

Rather than retrofit every endpoint by hand, modify `service/src/utils.py` so each generic CRUD helper takes an `owner_constraint` parameter that gets ANDed into every WHERE clause:

```python
def get_one(table, model, constraints, owner_constraint, db_name="default"):
    full = {**constraints, **owner_constraint}
    # build WHERE off `full`...

def get_many(table, model, constraints, owner_constraint, db_name="default"):
    # same: AND owner into the WHERE
```

Views become:

```python
@ombuddi_views.route('/api/v1/get_case_by_id/<id>')
@requires_principal
def get_case_by_id(id, principal: Principal):
    constraints = {'id': id}
    owner = {'organization_id': principal.organization_id}
    return get_one('cases', case_model, constraints, owner)
```

`@requires_principal` is a small decorator that decodes the Keycloak token, looks up / caches the ombuds row, and injects the principal. Missing or invalid → 401 before the view body runs.

For endpoints where the owner check has to traverse a relationship (e.g. `update_entry` needs to verify the entry's case's org matches), we add one helper: `verify_owner_via_parent(table, id, parent_table, parent_fk, owner_constraint)`. Used sparingly; the `organization_id`-on-entries addition above is specifically to reduce how often we need this.

## Cross-org reads

There are none. IOA reference codes are loaded from `web/src/constants/ioaConstants.ts` at runtime, not from the DB. If a future Ombuddi-provided reference pack (e.g. "Hospital ombuds defaults") needs to ship, it ships as another constants file with its own uuid5 namespace — same pattern.

## Open questions

- **Org-admin role.** Most real orgs will want a non-ombuds admin (HR contact, IT contact, IOA license holder) who can manage seats and billing but never see ombuds data. Define this when we get to subscriptions (Phase 6). Until then, principals are always ombuds.
- **Ombuddi-staff role.** Per Principle 5, Ombuddi staff must NOT be able to read tenant data. With IOA codes now living in code rather than the DB, there is no DB-side reason staff would need privileged access. Updating IOA codes is a code edit + deploy.
- **Org switching.** Can a single Keycloak user belong to multiple orgs? Common in higher ed (a person who's an ombuds at two universities). Punt for v1: one Keycloak account = one ombuds seat at one org.
- **Soft delete of an org.** A licensing lapse shouldn't immediately destroy data, but reads should be denied. Add an `organizations.status` column when we get to Phase 6.

## Test scenarios (write these as actual tests once auth lands)

1. **Two orgs, two ombuds.** Ombuds A's `/get_all_cases` returns only org A's cases.
2. **Direct UUID guess.** Ombuds A asks `/get_case_by_id/<a_case_belonging_to_org_B>` → 404. (Prefer 404 over 403 to avoid leaking row existence.)
3. **Update across orgs.** Ombuds A PUTs `/update_case` with an org B id → 404; row unchanged.
4. **Person enumeration.** Ombuds A's `/get_persons_by_hashed_name/<hash>` never returns org B persons even when the hash happens to collide (it won't, mathematically, but we still test).
5. **IOA codes resolve client-side.** Rendering a case that uses IOA codes never triggers `/get_code_by_id` for those ids. Confirmed via network panel.
6. **Cross-org reference in body.** Ombuds A POSTs `/add_entry` with a `case_id` whose case belongs to org B → 404 (case not visible to A) or 403; never accidentally writes.
7. **No-auth.** All endpoints, no token → 401.

## Implementation sequence (when Phase 4 starts)

1. Schema additions (`cases.organization_id`, `entries.organization_id`). Wipe + re-seed dev DB; update `schema.sql`. Pre-production freedom makes this trivial.
2. `auth.py`: token decode, JWKS verification, principal construction, the `@requires_principal` decorator.
3. `utils.py` rewrite: every generic helper takes `owner_constraint`.
4. View rewrite: every route adopts `@requires_principal`, drops the `<organization_id>` URL parameter where present (it's now redundant), and passes the principal's org as owner.
5. Frontend: replace `useUserId.ts` and `useOrganization.ts` with hooks that read claims off the Keycloak token instead of fetching `/get_ombuds_by_id`.
6. Manual run-through of the test scenarios above. Convert to automated tests when we add a test harness (Phase 0 follow-up).

## Pre-auth lift we can do now (safe under Principle 1)

If we want to chip away before Keycloak lands:

- [ ] Add `organization_id NOT NULL` to `cases` in `schema.sql` and the create-case payload. The frontend already computes the principal's org (via the chained `useUserId → ombuds → organization`); just pass it through.
- [ ] Add `organization_id NOT NULL` to `entries`. Same pattern.
- [ ] Add the `owner_constraint` parameter to `get_one` / `get_many` / `add_one` / `update_one` with a default of `{}` so existing call sites still work. Endpoints opt in to passing it.

Doing those three things ahead of time makes Phase 4 a smaller, lower-risk change.
