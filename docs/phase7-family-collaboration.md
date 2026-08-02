# Phase 7: Family collaboration and ownership

Phase 7 completes LifeBook's invitation-only family access model. A family owner can invite a trusted adult as a Guardian or Viewer, revoke unused invitations, change non-owner roles, remove access, and transfer family ownership after recent password confirmation.

## Invitation lifecycle

An invitation is stored at `families/{familyId}/invites/{inviteId}`. The callable backend creates a cryptographically random bearer secret and stores only its SHA-256 hash. The shared URL contains the family ID, invitation ID, and secret. Invitations:

- expire after seven days;
- are restricted to one normalized email address and require Firebase email verification;
- can be accepted only once and can be revoked before acceptance;
- do not grant direct Firestore access; and
- are removed by a daily cleanup function after expiration.

Creating a new invitation for the same email revokes any prior pending link. Owners may have no more than 20 active invitations at once.

## Acceptance and consent

The public `/join-family` route preserves the invite token through sign-in, adult-consent, account-creation, and email-verification checkpoints. `previewFamilyInvite` and `acceptFamilyInvite` validate the token server-side. Acceptance atomically creates the member record, points the user's setup record to the family and its active managed profile, records the parent-led consent version when needed, consumes the invitation, and writes an audit event.

An account that already belongs to a different family cannot accept an invitation. This prevents silent cross-family reassignment.

## Roles

- **Owner**: controls invitations, roles, member removal, privacy, export, and ownership.
- **Guardian**: reads the archive and may contribute when the owner enables Guardian editing.
- **Viewer** (`member` in stored data): reads the family archive but cannot create or modify content.

Client Firestore rules allow only owners to inspect invitation metadata and deny all client invitation writes. Privileged membership mutations are available only through authenticated callable functions.

## Removal and ownership transfer

Removing a Guardian or Viewer deletes their family membership and clears their user setup document without deleting immutable consent history, the shared archive, or their Authentication account. They can create or join another family later.

Ownership transfer requires a verified account and an authentication time no older than five minutes. The selected member becomes Owner atomically, and the previous owner remains as a Guardian. This unlocks the Phase 6 account-deletion path without risking another adult's shared archive.

All invitation, role, removal, and ownership operations create immutable family audit events. Account deletion treats both Guardians and Viewers as removable memberships and preserves shared family content.
