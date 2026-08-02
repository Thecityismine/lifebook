const { HttpsError } = require('firebase-functions/v2/https');

const { normalizeEmail, validInviteEmail } = require('./family-collaboration');

function cleanFamilyName(value) {
  if (typeof value !== 'string') return '';
  const name = value.trim();
  return name.length >= 2 && name.length <= 80 ? name : '';
}

function cleanProfileName(value) {
  if (typeof value !== 'string') return '';
  const name = value.trim();
  return name.length >= 2 && name.length <= 80 ? name : '';
}

function validProfileRelationship(value) {
  return ['My child', 'Grandchild', 'Other'].includes(value);
}

function parentSetupFromData(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return {
    familyId: typeof data.familyId === 'string' && data.familyId.trim()
      ? data.familyId.trim()
      : null,
    activeProfileId: typeof data.activeProfileId === 'string' && data.activeProfileId.trim()
      ? data.activeProfileId.trim()
      : null,
    onboardingComplete: data.onboardingComplete === true,
  };
}

function familyDisplayName(authUser, email) {
  if (typeof authUser.displayName === 'string' && authUser.displayName.trim()) {
    return authUser.displayName.trim().slice(0, 100);
  }
  return email.split('@')[0].slice(0, 100) || 'Parent';
}

async function requireAuthoritativelyVerifiedAccount(request, auth) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before creating a family space.');
  }

  const authUser = await auth.getUser(request.auth.uid);
  const email = normalizeEmail(authUser.email);
  if (authUser.emailVerified !== true || !validInviteEmail(email)) {
    throw new HttpsError('failed-precondition', 'Verify your email address before creating a family space.');
  }

  return {
    userId: request.auth.uid,
    email,
    displayName: familyDisplayName(authUser, email),
  };
}

module.exports = {
  cleanFamilyName,
  cleanProfileName,
  familyDisplayName,
  parentSetupFromData,
  requireAuthoritativelyVerifiedAccount,
  validProfileRelationship,
};
