# Phase 5: Reminders

Reminders are private, profile-scoped family records stored at `families/{familyId}/reminders/{reminderId}`.

## Fields

- `familyId`, `profileId`: immutable ownership and active managed-profile scope.
- `title`: required, up to 120 characters.
- `notes`: optional, up to 2,000 characters.
- `dueOn`: required local calendar date in `YYYY-MM-DD` format.
- `timeOfDay`: optional local 24-hour time in `HH:mm` format.
- `kind`: `birthday`, `appointment`, `school`, `activity`, `milestone`, or `other`.
- `personId`: optional linked family person ID, stored as an empty string when omitted.
- `completedAt`, `archivedAt`: nullable timestamps for reversible workflow states.
- `createdBy`, `schemaVersion`, `createdAt`, `updatedAt`: audit and migration metadata.

## Authorization

Verified family members may read reminders in their family. Owners and guardians may create or update them, and creation requires an existing managed profile in that family. Family/profile ownership and audit fields cannot be changed. Completion and archival are reversible; hard deletion is denied.

Phase 5 provides in-app reminders and the Home `Coming up` view. Device notification scheduling is intentionally a separate phase because it requires permission, delivery, and timezone policies beyond this data model.
