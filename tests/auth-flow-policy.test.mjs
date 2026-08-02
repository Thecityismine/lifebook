import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authSetupIdentity,
  reconcileConfirmedSetup,
  requiredSetupRoute,
  shouldRestartSetupSubscription,
} from '../src/services/auth-flow-policy.ts';

test('keeps the setup subscription during a token refresh for the same verified user', () => {
  const identity = authSetupIdentity({ uid: 'parent-1', emailVerified: true });

  assert.equal(shouldRestartSetupSubscription(identity, identity), false);
});

test('keeps a confirmed family while a stale empty snapshot catches up', () => {
  const confirmed = {
    familyId: 'family-1',
    activeProfileId: null,
    onboardingComplete: false,
  };

  assert.deepEqual(reconcileConfirmedSetup(null, confirmed), {
    setup: confirmed,
    pendingConfirmation: confirmed,
  });
  assert.deepEqual(reconcileConfirmedSetup(confirmed, confirmed), {
    setup: confirmed,
    pendingConfirmation: null,
  });
});

test('keeps completed onboarding while a stale incomplete snapshot catches up', () => {
  const confirmed = {
    familyId: 'family-1',
    activeProfileId: 'profile-1',
    onboardingComplete: true,
  };
  const stale = {
    familyId: 'family-1',
    activeProfileId: null,
    onboardingComplete: false,
  };

  assert.deepEqual(reconcileConfirmedSetup(stale, confirmed), {
    setup: confirmed,
    pendingConfirmation: confirmed,
  });
  assert.deepEqual(reconcileConfirmedSetup(confirmed, confirmed), {
    setup: confirmed,
    pendingConfirmation: null,
  });
});

test('restarts setup when the user or verification status changes', () => {
  const signedOut = authSetupIdentity(null);
  const unverified = authSetupIdentity({ uid: 'parent-1', emailVerified: false });
  const verified = authSetupIdentity({ uid: 'parent-1', emailVerified: true });

  assert.equal(shouldRestartSetupSubscription(signedOut, unverified), true);
  assert.equal(shouldRestartSetupSubscription(unverified, verified), true);
  assert.equal(shouldRestartSetupSubscription(verified, signedOut), true);
});

test('advances family setup to child onboarding as soon as a family exists', () => {
  assert.equal(requiredSetupRoute(null, false), '/family');
  assert.equal(requiredSetupRoute(null, true), null);
  assert.equal(requiredSetupRoute({
    familyId: 'family-1',
    activeProfileId: null,
    onboardingComplete: false,
  }, false), '/child');
});

test('does not redirect completed onboarding back into setup', () => {
  assert.equal(requiredSetupRoute({
    familyId: 'family-1',
    activeProfileId: 'profile-1',
    onboardingComplete: true,
  }, false), null);
});
