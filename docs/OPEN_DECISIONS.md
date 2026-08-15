# Open product decisions

This file is the parking place for questions that should remain explicit but
should not block the current administrator work.

## Case ownership and collaboration

**Current behavior:** cases and entries are shared by every Ombuddi user in an
organization.

**Question:** should a case have one owner, several explicitly assigned ombuds,
or remain organization-shared?

Before changing the schema, decide how these workflows should behave:

- temporary coverage and vacations;
- deliberate case handoff;
- two ombuds jointly working a case;
- whether entry authors may edit only their entries or every entry in a shared case;
- what happens to cases when a seat is deactivated;
- whether an organization administrator receives any case access by virtue of
  the administrator role (the default answer should be no).

## Reporting scope

**Current behavior:** reports aggregate at the organization level.

**Question:** should the application offer personal, organization-wide, and/or
explicitly shared reporting scopes?

The decision must cover who can run an organization-wide report, whether an
ombuds filter is allowed, whether small-cell suppression differs by scope, and
whether organization administrators can see aggregate results without seeing
case contents.

## Alpha security posture

Decide which controls belong in the usability alpha versus a later
security-focused environment. Topics include case isolation, export controls,
retention, legal hold, stricter production configuration, and a dedicated
security-testing deployment. Cross-organization isolation remains mandatory in
every environment.

## Deferred identity questions

- One Auth0 account holding seats in multiple organizations.
- MFA or step-up authentication for privileged changes (after alpha).
- Whether Auth0 account recovery should ever be self-service. The current
  recommendation is an audited replacement-seat process administered by a
  system administrator.

## Subscription model

The likely seat packages are 1, 2, 3, 5, 10, and 25. Monthly, yearly, and
eternal describe billing intervals rather than feature tiers, so the eventual
schema should keep these concepts separate. Alpha organizations receive 25
seats without billing.
