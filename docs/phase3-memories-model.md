# Phase 3 Memories data model

Memories form a private timeline for a managed profile. A memory is stored once and links to People records by identifier, so a shared moment can show everyone involved without duplicating their details.

## Firestore path

`families/{familyId}/memories/{memoryId}` stores:

- the immutable managed-profile identifier
- a title, optional story, and calendar date in `YYYY-MM-DD` format
- up to 20 linked People identifiers
- an optional private image URL and Storage path
- an archive timestamp instead of destructive deletion
- creator, schema version, and server timestamps

The client reads the family collection in real time, filters it to the active profile, and orders it by the memory date. Keeping the query index-free makes the first family timeline available immediately.

## Authorization boundary

- Verified family members may read memories and their images.
- Only owners and guardians may create, edit, archive, restore, or upload images.
- A new memory must point to an existing managed profile in the same family.
- Family, profile, creator, schema, and creation fields are immutable.
- Storage accepts images smaller than 8 MB and checks the same Firestore family membership.
- Cross-family reads and writes, hard deletion, and unknown Storage paths are denied.

## Phase 3 acceptance criteria

- Create and edit a dated memory with a title and optional story.
- Link and unlink active People records.
- Optionally upload or replace one private image.
- Browse, search, open, archive, and restore memories.
- Show a person's related memories from their profile.
- Enforce and emulator-test the family authorization boundary.
