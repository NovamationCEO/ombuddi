# Ombuddi — Multi-Tenancy Implementation

> Current implementation reference. Auth0 authentication and database-backed
> principal resolution are live; this document describes behavior, not a future plan.

## The rule

Every tenant-owned row belongs to exactly one organization. Request bodies and
URL parameters are inputs, never authority. The verified Auth0 subject is
resolved through `ombuds.auth0_sub`, and the resulting local ombuds and
organization UUIDs are the only identities used for authorization.

There are no cross-organization data reads. IOA reference codes are application
constants, so they do not require a privileged shared database tenant.

## Request principal

`service/app.py` validates the bearer token before protected API requests and
`service/src/principal.py` resolves the Auth0 subject to:

- local `ombuds_id`;
- immutable `organization_id`;
- organization-admin and system-admin flags;
- active status for both the seat and organization.

Missing or invalid tokens receive `401`. Authenticated but unlinked identities
receive `403` except for diagnostics and invitation claiming. Database lookup
failures receive `503`. Deactivated seats and organizations are rejected before
view code runs.

## Enforcement layers

1. Generic CRUD helpers receive an `owner_constraint` derived from the request
   principal. They do not trust client-supplied ownership fields.
2. Specialized endpoints use explicit organization predicates and transactions.
3. Inserts force-stamp principal organization and ombuds IDs where applicable.
4. Composite foreign keys and triggers reject cross-tenant relationships even if
   application validation regresses.
5. Tenant-scoped missing rows generally return `404` so row existence is not
   disclosed across organizations.

Cases are collaborative inside an organization. Any organization ombuds may add
an entry to a standard case, while only the entry author may edit that entry or
change its person links. General activity containers are owner-only. System
administrators manage organizations and seats but receive no bypass for reading
tenant case, entry, person, or report data.

## Identity boundaries

- Auth0 `sub` is external text stored only in `ombuds.auth0_sub`; it is never used
  as a local foreign key.
- One Auth0 identity currently maps to one Ombuddi seat and organization.
- A signed legacy organization claim, when present, must match the database
  principal. The database remains authoritative.
- Invitation claims require a signed, verified email matching the invited seat.

## Regression coverage

The backend suite covers token/principal failures, cross-tenant CRUD and
relationship attempts, invitation identity checks, deactivation, administrative
authorization, General-container ownership, entry authorship, and report scope.
When adding an endpoint, include both an allowed same-tenant request and a denied
cross-tenant or wrong-owner request.

## Remaining product decisions

- Whether one Auth0 identity should eventually switch among seats in multiple
  organizations. Version one intentionally uses one identity per seat.
- How a non-ombuds billing/contact role should work without receiving access to
  confidential case data.
- Automated retention and legal-hold policy, including who can pause purging and
  how that action is audited.
