# LifeBook

LifeBook is a private, parent-led family archive for preserving people, relationships, memories, and life chapters. It is built with Expo SDK 57, React Native, Expo Router, Firebase Authentication, Cloud Firestore, and Cloud Storage for Firebase.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add the development Firebase web-app configuration.
3. Start the application with `npx expo start`.

Firebase client configuration identifies the project but does not grant data access. Firestore and Storage rules enforce verified family membership and owner or guardian permissions.

## Useful checks

- `npm run lint` — Expo ESLint checks
- `npx tsc --noEmit` — strict TypeScript validation
- `npx expo-doctor` — Expo dependency and configuration checks
- `npx expo export --platform all` — Android, iOS, and static-web production exports
- `npm run test:rules` — Firestore and Storage authorization tests for People, Memories, Chapters, and Reminders; requires Java 21+
- `npm run vercel-build` — Vercel static-web build

## Firebase deployment

- `firebase deploy --only firestore:rules` publishes Firestore authorization.
- `firebase deploy --only storage` publishes private photo rules after a default Storage bucket exists.

New Firebase Storage buckets require the Firebase project to use the Blaze plan. After the private bucket and `storage.rules` are active, set `EXPO_PUBLIC_FIREBASE_STORAGE_ENABLED=true` in local and deployment environments. Until then, person creation remains available and the photo control explains that Storage setup is required.

The data models are documented in:

- [`docs/phase2-people-model.md`](docs/phase2-people-model.md)
- [`docs/phase3-memories-model.md`](docs/phase3-memories-model.md)
- [`docs/phase4-chapters-model.md`](docs/phase4-chapters-model.md)
- [`docs/phase5-reminders-model.md`](docs/phase5-reminders-model.md)
