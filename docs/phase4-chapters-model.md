# Phase 4 Chapters data model

Chapters organize existing memories into the places, seasons, milestones, and activities that shape a managed profile's story. A chapter links to Memories by identifier, so stories and People relationships remain stored in one canonical place.

## Firestore path

`families/{familyId}/chapters/{chapterId}` stores:

- the immutable managed-profile identifier
- a title and optional private description
- optional start and end calendar dates in `YYYY-MM-DD` format
- one icon and color from a fixed visual preset list
- up to 100 linked Memory identifiers
- an archive timestamp instead of destructive deletion
- creator, schema version, and server timestamps

The client derives the chapter's People list from its linked Memories. It reads the family Chapter collection in real time, filters to the active profile, and orders current chapters by their start date without requiring a Firestore composite index.

## Authorization boundary

- Verified family members may read Chapters.
- Only owners and guardians may create, edit, archive, or restore Chapters.
- A new Chapter must point to an existing managed profile in the same family.
- Family, profile, creator, schema, and creation fields are immutable.
- Chapter records are never hard-deleted by the client.
- Cross-family reads and writes are denied.

## Phase 4 acceptance criteria

- Create and edit a Chapter with a title, description, optional date range, icon, and color.
- Link and unlink active Memories and derive the People involved.
- Browse, search, open, archive, and restore Chapters.
- Open linked Memories directly from a Chapter.
- Show live Chapter totals on Home and connect the Add menu.
- Enforce and emulator-test the family authorization boundary.
