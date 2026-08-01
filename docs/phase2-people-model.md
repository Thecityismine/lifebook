# Phase 2 People data model

People are family-owned records. Relationships are separate records so the same person can have a different relationship to every managed profile without duplicating their identity.

## Firestore paths

`families/{familyId}/people/{personId}` stores the person's shared identity:

- first and last name
- optional nickname and birthday
- private family notes
- standard and custom tags
- optional photo URL and private Storage path
- archive timestamp instead of destructive deletion
- creator, schema version, and server timestamps

`families/{familyId}/people/{personId}/relationships/{profileId}` stores the relationship to one managed profile:

- relationship label, such as cousin, teacher, or best friend
- relationship-specific private notes
- immutable family, person, and profile identifiers
- creator and server timestamps

`families/{familyId}/profiles/{profileId}` remains independent of authentication identity so managed-profile ownership can be transferred safely in a future phase.

## Authorization boundary

- Verified family members may read People records and photos.
- Only owners and guardians may create, edit, archive, restore, or upload photos.
- Person documents cannot move between families and are never deleted from the client.
- Relationship documents must point to an existing managed profile in the same family.
- Storage accepts images smaller than 8 MB only and checks the same Firestore family membership.
