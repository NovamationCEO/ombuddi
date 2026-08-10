# Production migration: Auth0 subject vs. local ombuds ID

Run this migration before deploying the API changes that resolve authenticated
users through `ombuds.auth0_sub`.

## 1. Connect to the Render database

In the Render dashboard, open the Postgres service and copy its external
**PSQL Command** from **Connect**. Run that command from a terminal to confirm
that the database is available.

## 2. Add the external-identity column

From the repository root, use the external database URL or the equivalent PSQL
command from Render:

```sh
psql "$EXTERNAL_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f service/migrations/001_add_ombuds_auth0_sub.sql
```

The migration is additive and safe to run again. It does not alter any local
UUIDs or foreign keys.

## 3. Link the existing Auth0 account

First list the local ombuds rows so the correct account can be selected:

```sql
SELECT id, name, organization_id, auth0_sub
FROM ombuds
ORDER BY name;
```

Then link the existing alpha account. Replace `LOCAL_OMBUDS_UUID` with the
matching UUID from the query above:

```sql
UPDATE ombuds
SET auth0_sub = 'auth0|6a416db3b92ce3ffd623bb34'
WHERE id = 'LOCAL_OMBUDS_UUID';
```

Verify that exactly one row is linked:

```sql
SELECT id, name, organization_id, auth0_sub
FROM ombuds
WHERE auth0_sub = 'auth0|6a416db3b92ce3ffd623bb34';
```

Do not change `ombuds.id`. Existing `entries.ombuds_id` foreign keys continue
to reference that local UUID.

## 4. Deploy in order

1. Apply and verify the database migration.
2. Deploy the Flask API.
3. Deploy the React frontend immediately afterward.
4. Sign out and back in so the frontend obtains a fresh token.

The API returns `403` with “Authenticated account is not linked to an Ombuddi
user” if the migration ran but the current subject was not linked. It returns
`503` if the identity lookup cannot reach the database.

## 5. Smoke test

After signing in:

1. Open the Cases screen and confirm existing cases load.
2. Create a new case.
3. Add an entry to that case.
4. Open Profile and Organization.

New cases receive `organization_id` from the resolved principal. New entries
receive both `organization_id` and the local `ombuds_id` from the resolved
principal, regardless of anything sent by the browser.
