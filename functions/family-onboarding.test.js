const assert = require('node:assert/strict');
const test = require('node:test');

const {
  cleanFamilyName,
  cleanProfileName,
  familyDisplayName,
  parentSetupFromData,
  requireAuthoritativelyVerifiedAccount,
  validProfileRelationship,
} = require('./family-onboarding');

test('validates and normalizes family names', () => {
  assert.equal(cleanFamilyName('  Medina family  '), 'Medina family');
  assert.equal(cleanFamilyName('M'), '');
  assert.equal(cleanFamilyName('x'.repeat(81)), '');
});

test('validates managed profile onboarding input', () => {
  assert.equal(cleanProfileName('  Riley  '), 'Riley');
  assert.equal(cleanProfileName('R'), '');
  assert.equal(cleanProfileName('x'.repeat(81)), '');
  assert.equal(validProfileRelationship('My child'), true);
  assert.equal(validProfileRelationship('Grandchild'), true);
  assert.equal(validProfileRelationship('Other'), true);
  assert.equal(validProfileRelationship('Owner'), false);
});

test('returns only the setup fields needed by the client', () => {
  assert.deepEqual(parentSetupFromData({
    familyId: ' family-1 ',
    activeProfileId: ' profile-1 ',
    onboardingComplete: true,
    email: 'private@example.com',
  }), {
    familyId: 'family-1',
    activeProfileId: 'profile-1',
    onboardingComplete: true,
  });
  assert.equal(parentSetupFromData(null), null);
});

test('uses the authoritative account when the browser token has a stale verification claim', async () => {
  const result = await requireAuthoritativelyVerifiedAccount(
    { auth: { uid: 'parent-1', token: { email_verified: false } } },
    {
      getUser: async () => ({
        uid: 'parent-1',
        email: 'Parent@Example.com',
        emailVerified: true,
        displayName: '  Parent One  ',
      }),
    },
  );

  assert.deepEqual(result, {
    userId: 'parent-1',
    email: 'parent@example.com',
    displayName: 'Parent One',
  });
});

test('rejects an account that is not authoritatively verified', async () => {
  await assert.rejects(
    requireAuthoritativelyVerifiedAccount(
      { auth: { uid: 'parent-1', token: { email_verified: true } } },
      {
        getUser: async () => ({
          uid: 'parent-1',
          email: 'parent@example.com',
          emailVerified: false,
          displayName: null,
        }),
      },
    ),
    (error) => error.code === 'failed-precondition',
  );
});

test('builds a safe fallback display name from the verified email', () => {
  assert.equal(familyDisplayName({ displayName: '' }, 'parent@example.com'), 'parent');
});
