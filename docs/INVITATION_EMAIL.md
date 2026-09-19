# Invitation email from Microsoft 365

The official sender is **admin@ombuddi.com**. Every invitation creation flow
(including organization onboarding and replacement invitations) submits a
plain-text message through Microsoft Graph after the database commits.
The recipient is the email bound to the invitation, never an arbitrary address
supplied alongside a send request. No case or visitor information is included.

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
Issuing another invitation revokes the previous link. Delivery status is returned
in the creation response, not persisted as delivery history. A process crash
between commit and send requires manual recovery or a replacement invitation;
there is no background delivery queue. Secrets, raw links, and provider error
bodies are not logged by the sender.

Auth0 verification/password reset mail is configured separately. This change
only handles Ombuddi invitations.

References: [Microsoft Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0),
[Exchange application RBAC](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac),
[OAuth client credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow).
