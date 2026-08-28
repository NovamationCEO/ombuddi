# Alpha administrator tools

The first admin workflow supports:

- creating an unlinked ombuds seat in the administrator's organization;
- marking a seat as an organization administrator;
- generating or replacing a seven-day, one-time invitation link;
- allowing the invited Auth0 account to claim the local seat;
- keeping Auth0 subjects separate from local UUID primary keys.

System administrators can additionally manage seats in an existing
organization: create and invite users, edit the recorded email, promote or
remove organization-admin status, deactivate/reactivate seats, cancel pending
invitations, review invitation history, and inspect the administrative audit
log. These tools expose user names, emails, roles, and lifecycle state only;
they do not expose cases, visitors, entries, or notes.

Email delivery is not implemented yet. The administrator copies the generated
link and sends it through an appropriate channel.

Invitation claiming requires these signed, namespaced claims in the Auth0
access token:

- `https://ombuddi.com/email`
- `https://ombuddi.com/email_verified` (the boolean value `true`)

They are populated by the **Add Verified Email Claims** Post-Login Action. The
Action must run for unlinked invitees as well as existing Ombuddi users.

## Production rollout

Apply the identity migration first if it has not already been applied:

```psql
\i /Users/nova/Code/ombuddi/service/migrations/001_add_ombuds_auth0_sub.sql
```

Then apply the remaining migrations in order:

```psql
\i /Users/nova/Code/ombuddi/service/migrations/002_add_admin_invitations.sql
\i /Users/nova/Code/ombuddi/service/migrations/003_add_subscription.sql
\i /Users/nova/Code/ombuddi/service/migrations/004_add_system_admin.sql
\i /Users/nova/Code/ombuddi/service/migrations/005_enforce_tenant_relationships.sql
\i /Users/nova/Code/ombuddi/service/migrations/006_bind_invitations_to_email.sql
\i /Users/nova/Code/ombuddi/service/migrations/007_add_deactivation.sql
\i /Users/nova/Code/ombuddi/service/migrations/008_expand_administrative_audit.sql
\i /Users/nova/Code/ombuddi/service/migrations/009_add_case_referral_sources.sql
\i /Users/nova/Code/ombuddi/service/migrations/010_repair_universal_referral_sources.sql
```

Migration 005 checks existing rows before installing tenant-aware foreign keys
and the entry-person guard. It aborts without changing the schema if it finds a
cross-organization relationship that needs manual review.

Migration 006 binds invitations to the target seat email. Existing active
invitations without a usable email are revoked and must be reissued.

Migration 007 adds reversible organization and user-seat status, status/date
consistency checks, a positive seat-limit constraint, and an append-only audit
trail. Apply it **before** deploying API code that reads `is_active`.

Migration 010 repairs the application-managed **Other (please specify)** and
**Unknown** referral choices for organizations created before that backfill was
installed. It is idempotent and can be run again safely.

Bootstrap the existing alpha user as the first administrator:

```sql
UPDATE ombuds
SET is_admin = TRUE
WHERE auth0_sub = 'auth0|6a416db3b92ce3ffd623bb34';
```

Verify the result:

```sql
SELECT id, name, email, auth0_sub, is_admin
FROM ombuds
ORDER BY name;
```

Deploy the API before the frontend. After both deployments complete, sign out
and back in, open the account menu, and select **Manage Users**.

The Render static-site rewrite from `/*` to `/index.html` must be active so an
invitation URL can load `/accept-invite` directly.

## Security behavior

- Only a locally linked row with `is_admin = TRUE` can use admin endpoints.
- Admin queries and writes are constrained to the administrator's organization.
- Raw invitation tokens are returned once and only their SHA-256 hashes are stored.
- Each invitation snapshots the target seat email and can only be claimed by an
  Auth0 account presenting that same verified email in its signed access token.
- Creating a replacement invitation revokes earlier unclaimed links for the seat.
- Invitations expire after seven days and can be claimed once.
- The claim endpoint accepts an authenticated but unlinked Auth0 user, and no
  other application endpoint does.

## Deactivation behavior

- Deactivation is reversible and does not delete records or remove the Auth0
  subject link from a local user.
- A deactivated user is rejected during every authenticated request. A
  deactivated organization blocks all its users, including its administrators.
- Organization administrators can deactivate and reactivate seats in their own
  organization. They cannot deactivate themselves, a system administrator, or
  the organization's last active administrator.
- Deactivated seats do not count against the seat limit. Reactivation is refused
  when all active seats are already in use.
- Only a system administrator can deactivate or reactivate an organization, and
  cannot deactivate the organization containing their own account.
- Deactivating either a seat or an organization revokes its unused invitation
  links. Invitation claiming also verifies both statuses inside its transaction.
- Reactivating an organization does not reactivate users who were individually
  deactivated.
- Every status change records the actor, target, timestamp, event type, and an
  optional reason in `administrative_events`. Database triggers prevent
  those events from being updated or deleted.

## Lost Auth0 account recovery

Do not overwrite `ombuds.auth0_sub` with a new subject as an ordinary support
operation. A subject change is an account takeover if identity verification is
wrong, and overwriting it destroys the identity history.

The safe alpha recovery procedure is:

1. Verify the request outside Ombuddi through an established organization
   contact, not through information supplied only in the recovery request.
2. Have a system administrator create and invite a replacement organization
   administrator seat.
3. Require the replacement Auth0 identity to claim its email-bound invitation.
4. Confirm that the replacement administrator can sign in and use the admin
   tools.
5. Deactivate the lost seat. Do not delete it or rewrite its historical entries.
6. Record the recovery reason in the audit log and retain the old Auth0 subject
   on the deactivated seat.

If the replacement must use the same email as the lost seat, the current unique
email constraint requires a separately reviewed identity-recovery feature or a
manual database procedure. Do not work around it by silently unlinking the old
subject. A future recovery feature should preserve external-identity history in
a separate table and should require stronger verification (and eventually
step-up authentication) before rebinding a seat.

Changing a linked seat's recorded email changes Ombuddi's administrative
contact information only. Authentication continues to use the linked Auth0
subject.

## Hashing salt configuration

`NAME_SALT` is a server-side secret mixed into every private-person name hash.
It is not an encryption key and it cannot recover a name, but it ensures that a
copied database cannot be tested against candidate names without also knowing a
deployment secret.

The previous sample environment used `SALT` while the application read
`NAME_SALT`; the application then silently used the literal `fallback-salt`.
That made deployments appear configured while removing the deployment-specific
secret. `NAME_SALT` is now canonical, the legacy `SALT` name remains accepted
temporarily, and startup fails if neither exists. Never rotate this value after
private persons have been stored: without the original value, existing hashes
cannot be reproduced for lookup.
