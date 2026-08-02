# Phase 6: Privacy controls and account lifecycle

## Privacy and visibility

LifeBook remains family-only: there is no public visibility mode. The owner controls whether guardians may create or edit family content through `families/{familyId}/settings/privacy`. Existing families default to guardian editing until the owner explicitly changes the setting, preserving previous behavior.

Each privacy change writes an immutable event to `families/{familyId}/auditEvents`. The schema also reserves audited event types for future role and ownership workflows.

## Consent history and export

Consent records remain immutable at `users/{userId}/consents/{version}` and are displayed in the privacy screen. Export requires password reauthentication and produces UTF-8 JSON containing the account record, consent history, family metadata, members, profiles, people and relationships, memories, chapters, reminders, privacy settings, and audit events. Stored media URLs remain linked in their records.

## Account deletion

The public `/delete-account` route allows an account holder to sign in and initiate deletion outside an installed app. The `deleteLifeBookAccount` callable requires a verified token authenticated within five minutes.

- A sole owner deletes the entire family document tree, private family Storage prefix, user document tree, and Firebase Authentication account.
- An owner with other family members must transfer ownership first so another adult's family data cannot be silently erased.
- A guardian deletes their membership, user document tree, and Authentication account without deleting the shared family archive. Creator identifiers on retained shared records are anonymized.
- Hard deletion is server-authoritative; client rules do not grant recursive delete access.

The callable creates a content-free deletion receipt with a random request ID. `purgeExpiredDeletionReceipts` runs daily and removes receipts after 30 days.

## Retention and recovery

- Active and archived family content is retained until an authorized account deletion.
- Export files are written only to the user's download location or temporary device cache and are then controlled by the user/device.
- Deletion receipts contain no email, name, user ID, family ID, or family content and expire after 30 days.
- Account deletion is irreversible. Ownership transfer is required before multi-member family deletion.
- Firebase-managed backups follow the provider's deletion and backup lifecycle and are not available through the LifeBook application.

Before public store release, the publisher must add final privacy/support contact details and obtain the legal and child-privacy review required by the product requirements.
