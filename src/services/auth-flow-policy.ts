export type AuthSetupIdentity = {
  userId: string | null;
  emailVerified: boolean;
};

type AuthUserIdentity = {
  uid: string;
  emailVerified: boolean;
};

export type ParentSetupState = {
  familyId: string | null;
  activeProfileId: string | null;
  onboardingComplete: boolean;
};

export type SetupReconciliation = {
  setup: ParentSetupState | null;
  pendingConfirmation: ParentSetupState | null;
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

export function reconcileConfirmedSetup(
  observed: ParentSetupState | null,
  pendingConfirmation: ParentSetupState | null,
): SetupReconciliation {
  if (!pendingConfirmation) {
    return { setup: observed, pendingConfirmation: null };
  }

  const familyMatches = observed?.familyId === pendingConfirmation.familyId;
  const completionMatches = !pendingConfirmation.onboardingComplete
    || (observed?.onboardingComplete === true
      && observed.activeProfileId === pendingConfirmation.activeProfileId);

  if (familyMatches && completionMatches) {
    return { setup: observed, pendingConfirmation: null };
  }

  return {
    setup: pendingConfirmation,
    pendingConfirmation,
  };
}
