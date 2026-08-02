const assert = require('node:assert/strict');
const test = require('node:test');

const {
  cleanFamilyName,
  familyDisplayName,
  requireAuthoritativelyVerifiedAccount,
} = require('./family-onboarding');

test('validates and normalizes family names', () => {
  assert.equal(cleanFamilyName('  Medina family  '), 'Medina family');
  assert.equal(cleanFamilyName('M'), '');
  assert.equal(cleanFamilyName('x'.repeat(81)), '');
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
