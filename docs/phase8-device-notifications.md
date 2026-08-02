# Phase 8: Device reminder notifications

Phase 8 adds optional local notifications for the private reminders introduced in Phase 5. It does not add remote push notifications, device tokens, notification-server storage, or new Firestore data.

## User flow

- A verified family member opens **Reminders → notification settings** or **Privacy & data → Reminder notifications**.
- Notifications remain off until the member explicitly enables them and accepts the operating-system permission prompt.
- The setting is local to the signed-in account, family, managed profile, and physical device. Each phone or tablet must opt in separately.
- The settings screen reports permission state and the number of future reminders currently scheduled.
- Tapping a LifeBook notification opens its reminder only after the existing authentication, email-verification, family, and active-profile checks succeed.

The static web app keeps the settings route visible but accurately explains that device scheduling is available only in the iOS and Android app.

## Scheduling policy

- Only incomplete, unarchived reminders with a future trigger time are scheduled.
- `timeOfDay` uses the reminder’s local `HH:mm` value. A blank time defaults to 09:00 local time.
- Invalid local dates, invalid times, and nonexistent local times during daylight-saving transitions are skipped.
- Schedules are ordered chronologically and capped at the next 60 reminders.
- The active device timezone is recorded with the local schedule registry. Returning the app to the foreground rechecks permission and rebuilds schedules when the timezone or reminder set changes.
- Reminder edits, completion, archival, restoration, profile changes, account changes, permission changes, disabling notifications, and sign-out reconcile or cancel LifeBook-managed schedules.
- A versioned AsyncStorage registry records every native schedule identifier. Partial scheduling failures preserve already-created identifiers so a later retry can safely cancel them.

## Privacy policy

Notification Center and lock-screen content is intentionally generic:

- Title: `LifeBook reminder`
- Body: `You have a private family reminder.`

Names, reminder titles, notes, family names, and dates are never placed in visible notification text. The local notification data contains only the protected reminder route and internal family/profile/reminder IDs required to validate and open the record.

LifeBook creates an Android channel named **Private reminders** with private lock-screen visibility and no badge. Foreground alerts are handled explicitly. Permission requests do not request badge access.

## Reconciliation boundaries

LifeBook cancels only native identifiers in its own versioned registry rather than using the global “cancel all” API. This avoids disturbing future notification categories that may be added to the app.

If a notification is tapped for a different active family or managed profile, navigation is refused. If the member is signed out, LifeBook preserves the pending tap, opens sign-in, and navigates only after the protected account setup is available.

## Verification

- Notification policy tests cover the 09:00 default, validation, active/future filtering, ordering, schedule caps, and encoded reminder routes.
- Strict TypeScript and Expo lint cover the provider, native API shape, settings screen, and protected routing.
- Expo production web export verifies the unsupported-platform fallback remains statically renderable.
- Expo Doctor and the existing function/rules/browser suites remain part of the release gate.

Physical-device acceptance still requires an iOS or Android build because browser automation cannot grant native OS notification permission or inspect Notification Center. Local notifications do not require push credentials and remain available without a notification backend.
