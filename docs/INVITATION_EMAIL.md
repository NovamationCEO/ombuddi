# Invitation email from Microsoft 365

The official sender is **admin@ombuddi.com**. Every invitation creation flow
(including organization onboarding and replacement invitations) submits a
plain-text message through Microsoft Graph after the database commits.
The recipient is the email bound to the invitation, never an arbitrary address
supplied alongside a send request. No case or visitor information is included.

## Database rollout

Apply `service/migrations/015_add_invitation_email_audit.sql` before deploying
this version. It expands the audit event constraint without modifying existing
events. Fresh databases use the updated `service/schema.sql`. Without this
migration, the audit write fails and sending is skipped.

## Microsoft administrator setup

1. In Microsoft Entra admin center, create a single-tenant app registration
   named **Ombuddi invitations**. Record the Directory (tenant) ID and Application
   (client) ID. No redirect URI is needed for this server-to-server integration.
2. Create a client secret and save its **value** directly in the backend's secret
   settings. Record the expiration date for rotation. Do not put it in chat,
   frontend environment variables, or source control.
3. In **Enterprise applications**, find the application's **Object ID**. This
   is the service principal ID, not the app registration's Object ID.
4. Use Exchange Online PowerShell to grant sending access only to the sender:

   ```powershell
   Connect-ExchangeOnline
   New-ServicePrincipal -AppId <client-id> -ObjectId <enterprise-app-object-id> -DisplayName "Ombuddi invitations"
   New-ManagementScope -Name "Ombuddi invitation sender" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'admin@ombuddi.com'"
   New-ManagementRoleAssignment -Name "Ombuddi invitation mail" -Role "Application Mail.Send" -App <enterprise-app-object-id> -CustomResourceScope "Ombuddi invitation sender"
   Test-ServicePrincipalAuthorization -Identity <enterprise-app-object-id> -Resource admin@ombuddi.com
   ```

   Confirm `Application Mail.Send` is in scope. Check another mailbox is out
   of scope. Do not also grant tenant-wide `Mail.Send` in Entra; permissions
   from Entra and Exchange RBAC are additive. Permission propagation can take
   up to two hours.

5. Set these **backend** environment variables and restart/redeploy the backend:

   ```dotenv
   INVITATION_EMAIL_ENABLED=true
   MICROSOFT_TENANT_ID=<tenant-id>
   MICROSOFT_CLIENT_ID=<client-id>
   MICROSOFT_CLIENT_SECRET=<secret-value>
   FRONTEND_URL=https://<public-ombuddi-app-host>
   ```

   Local Docker passes these variables through from `service/.env`.
   Sending requires an HTTPS frontend URL so real recipients receive a usable,
   secure invitation. Mail remains disabled by default for local development.

6. Create a test seat for an email you control and issue an invitation. Confirm
   the UI reports Microsoft acceptance, the mailbox's Sent Items has the
   message, and the recipient receives it from `admin@ombuddi.com`. Open the
   link and verify the matching email can claim the seat. Verify Microsoft 365
   domain authentication (SPF/DKIM/DMARC) and inspect message trace for failures.

## Delivery behavior

A Graph 202 means accepted for processing, not confirmed inbox delivery.
Failures and timeouts leave the invitation usable and display an unconfirmed
status; no automatic retry risks sending duplicate messages after a timeout.
Check Sent Items/message trace before sharing the existing link manually.
Issuing another invitation revokes the previous link. Sending attempts and outcomes are persisted as `ombuds_invitation_email` events
in the system administrator audit log, associated with the invitation ID.
Statuses distinguish `started`, `accepted`, `not_configured`,
`configuration_error`, `failed` (before submission), `rejected` (HTTP 4xx), and
`unconfirmed` (possibly submitted). A lone `started` event means the final
outcome is unknown; inspect Microsoft message trace before recovery. Failure
to save the initial audit event prevents sending. Failure to save the final
event is reported separately without overwriting the sending result.
A process crash between invitation commit and attempt recording requires
manual recovery or a replacement invitation; there is no background queue. Secrets, raw links, and provider error
bodies are not logged by the sender.

Auth0 verification/password reset mail is configured separately. This change
only handles Ombuddi invitations.

References: [Microsoft Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0),
[Exchange application RBAC](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac),
[OAuth client credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow).

Sending still runs synchronously on the request worker. Microsoft access tokens
are cached per worker using the provider's `expires_in` with a 60-second margin;
credential changes invalidate the cache key. The token and send requests each
use a 10-second blocking-operation timeout, not an overall request deadline.
A slow provider or proxy timeout can therefore leave a committed invitation
without a response in the browser. Consult the audit log and message trace
before replacing it. Token caching reduces authentication calls but does not
remove this synchronous-delivery limitation.

The sender's Sent Items contains recipient addresses and raw invitation links.
Claiming still requires the matching verified Auth0 email, but the message is
sensitive: restrict mailbox access and apply an appropriate mail retention
policy. Audit events contain no raw invitation tokens or message bodies.
Logs contain only the failure stage, exception class, and HTTP status; a 403
can indicate incorrect permissions as well as propagation delay.
