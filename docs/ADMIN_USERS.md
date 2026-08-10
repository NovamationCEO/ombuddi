# Alpha administrator tools

The first admin workflow supports:

- creating an unlinked ombuds seat in the administrator's organization;
- marking a seat as an organization administrator;
- generating or replacing a seven-day, one-time invitation link;
- allowing the invited Auth0 account to claim the local seat;
- keeping Auth0 subjects separate from local UUID primary keys.

Email delivery is not implemented yet. The administrator copies the generated
link and sends it through an appropriate channel.

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
```

Migration 005 checks existing rows before installing tenant-aware foreign keys
and the entry-person guard. It aborts without changing the schema if it finds a
cross-organization relationship that needs manual review.

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
- Creating a replacement invitation revokes earlier unclaimed links for the seat.
- Invitations expire after seven days and can be claimed once.
- The claim endpoint accepts an authenticated but unlinked Auth0 user, and no
  other application endpoint does.
