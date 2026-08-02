const assert = require('node:assert/strict');
const test = require('node:test');

const { FAMILY_CREATED_BY_COLLECTIONS, RECENT_AUTH_SECONDS, deletionMode, hasRecentVerifiedAuth } = require('./account-lifecycle');

test('recent verified authentication is required for deletion', () => {
  const now = 10_000;
  assert.equal(hasRecentVerifiedAuth({ token: { email_verified: true, auth_time: now - 20 } }, now), true);
  assert.equal(hasRecentVerifiedAuth({ token: { email_verified: false, auth_time: now - 20 } }, now), false);
  assert.equal(hasRecentVerifiedAuth({ token: { email_verified: true, auth_time: now - RECENT_AUTH_SECONDS - 1 } }, now), false);
  assert.equal(hasRecentVerifiedAuth(null, now), false);
});

test('deletion planning protects families with multiple members', () => {
  assert.equal(deletionMode('owner', 1), 'family');
  assert.equal(deletionMode('owner', 2), 'transfer-required');
  assert.equal(deletionMode('guardian', 2), 'membership');
  assert.equal(deletionMode('member', 2), 'membership');
  assert.equal(deletionMode('viewer', 2), 'denied');
});

test('guardian anonymization covers every family collection with creator identifiers', () => {
  assert.deepEqual(FAMILY_CREATED_BY_COLLECTIONS, ['profiles', 'people', 'memories', 'chapters', 'reminders']);
});
