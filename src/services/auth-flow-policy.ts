export type AuthSetupIdentity = {
  userId: string | null;
  emailVerified: boolean;
};

type AuthUserIdentity = {
  uid: string;
  emailVerified: boolean;
};

type ParentSetupState = {
  familyId: string | null;
  onboardingComplete: boolean;
};

export function authSetupIdentity(user: AuthUserIdentity | null): AuthSetupIdentity {
  return {
    userId: user?.uid ?? null,
    emailVerified: user?.emailVerified === true,
  };
}

export function shouldRestartSetupSubscription(
  previous: AuthSetupIdentity,
  next: AuthSetupIdentity,
): boolean {
  return previous.userId !== next.userId || previous.emailVerified !== next.emailVerified;
}

export function requiredSetupRoute(
  setup: ParentSetupState | null,
  setupLoading: boolean,
): '/family' | '/child' | null {
  if (setupLoading) {
    return null;
  }

  if (!setup?.familyId) {
    return '/family';
  }

  if (!setup.onboardingComplete) {
    return '/child';
  }

  return null;
}
