const assert = require('node:assert/strict');
const test = require('node:test');

const {
  INVITE_LIFETIME_MS,
  createInviteToken,
  inviteIsUsable,
  inviteSecretMatches,
  normalizeEmail,
  parseInviteToken,
  validInviteEmail,
  validInviteRole,
} = require('./family-collaboration');

test('invite tokens round-trip without storing the bearer secret', () => {
  const created = createInviteToken('family_12345', 'invite_12345', 'secret_1234567890');
  const parsed = parseInviteToken(created.token);

  assert.deepEqual(parsed, {
    familyId: 'family_12345',
    inviteId: 'invite_12345',
    secret: 'secret_1234567890',
  });
  assert.equal(inviteSecretMatches(parsed.secret, created.tokenHash), true);
  assert.equal(inviteSecretMatches('secret_0000000000', created.tokenHash), false);
  assert.equal(created.tokenHash.includes(parsed.secret), false);
});

test('invite input validation normalizes email and limits roles', () => {
  assert.equal(normalizeEmail('  Parent@Example.COM '), 'parent@example.com');
  assert.equal(validInviteEmail('parent@example.com'), true);
  assert.equal(validInviteEmail('not-an-email'), false);
  assert.equal(validInviteRole('guardian'), true);
  assert.equal(validInviteRole('member'), true);
  assert.equal(validInviteRole('owner'), false);
});

test('invite usability requires pending status and a future expiry', () => {
  const now = 1_000_000;
  const future = { toMillis: () => now + INVITE_LIFETIME_MS };
  const past = { toMillis: () => now - 1 };

  assert.equal(inviteIsUsable({ status: 'pending', expiresAt: future }, now), true);
  assert.equal(inviteIsUsable({ status: 'accepted', expiresAt: future }, now), false);
  assert.equal(inviteIsUsable({ status: 'pending', expiresAt: past }, now), false);
  assert.equal(parseInviteToken('broken-token'), null);
});
