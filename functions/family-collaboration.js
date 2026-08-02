const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_ROLES = new Set(['guardian', 'member']);
const TOKEN_PART = /^[A-Za-z0-9_-]{10,128}$/;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validInviteEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validInviteRole(value) {
  return typeof value === 'string' && INVITE_ROLES.has(value);
}

function hashInviteSecret(secret) {
  return createHash('sha256').update(secret).digest('hex');
}

function createInviteToken(familyId, inviteId, secret = randomBytes(32).toString('base64url')) {
  if (!TOKEN_PART.test(familyId) || !TOKEN_PART.test(inviteId) || !TOKEN_PART.test(secret)) {
    throw new Error('Invite token parts are invalid.');
  }
  return {
    token: `${familyId}.${inviteId}.${secret}`,
    tokenHash: hashInviteSecret(secret),
  };
}

function parseInviteToken(token) {
  if (typeof token !== 'string' || token.length > 400) {
    return null;
  }
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts.some((part) => !TOKEN_PART.test(part))) {
    return null;
  }
  return { familyId: parts[0], inviteId: parts[1], secret: parts[2] };
}

function inviteSecretMatches(secret, tokenHash) {
  if (typeof tokenHash !== 'string' || !/^[a-f0-9]{64}$/.test(tokenHash)) {
    return false;
  }
  const actual = Buffer.from(hashInviteSecret(secret), 'hex');
  const expected = Buffer.from(tokenHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function inviteIsUsable(invite, nowMillis = Date.now()) {
  const expiresAt = invite?.expiresAt?.toMillis?.();
  return invite?.status === 'pending'
    && typeof expiresAt === 'number'
    && expiresAt > nowMillis;
}

module.exports = {
  INVITE_LIFETIME_MS,
  createInviteToken,
  inviteIsUsable,
  inviteSecretMatches,
  normalizeEmail,
  parseInviteToken,
  validInviteEmail,
  validInviteRole,
};
