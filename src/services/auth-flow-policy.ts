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

type CachedParentSetup = {
  version: 1;
  familyId: string;
  activeProfileId: string;
  onboardingComplete: true;
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

export function isConfirmedSetupMissing(snapshotExists: boolean, fromCache: boolean): boolean {
  return !snapshotExists && !fromCache;
}

export function requiredSetupRoute(
  setup: ParentSetupState | null,
  setupLoading: boolean,
  setupError = false,
): '/family' | '/child' | null {
  if (setupLoading || setupError) {
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

export function serializeCompletedSetup(setup: ParentSetupState | null): string | null {
  if (!setup?.onboardingComplete || !setup.familyId || !setup.activeProfileId) {
    return null;
  }

  const cached: CachedParentSetup = {
    version: 1,
    familyId: setup.familyId,
    activeProfileId: setup.activeProfileId,
    onboardingComplete: true,
  };
  return JSON.stringify(cached);
}

export function parseCompletedSetup(value: string | null): ParentSetupState | null {
  if (!value) {
    return null;
  }

  try {
    const cached = JSON.parse(value) as Partial<CachedParentSetup>;
    if (cached.version !== 1
      || cached.onboardingComplete !== true
      || typeof cached.familyId !== 'string'
      || !cached.familyId
      || typeof cached.activeProfileId !== 'string'
      || !cached.activeProfileId) {
      return null;
    }

    return {
      familyId: cached.familyId,
      activeProfileId: cached.activeProfileId,
      onboardingComplete: true,
    };
  } catch {
    return null;
  }
}
