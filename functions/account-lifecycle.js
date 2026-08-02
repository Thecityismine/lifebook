const RECENT_AUTH_SECONDS = 5 * 60;
const FAMILY_CREATED_BY_COLLECTIONS = ['profiles', 'people', 'memories', 'chapters', 'reminders'];

function hasRecentVerifiedAuth(auth, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!auth || auth.token?.email_verified !== true || typeof auth.token?.auth_time !== 'number') {
    return false;
  }
  const age = nowSeconds - auth.token.auth_time;
  return age >= 0 && age <= RECENT_AUTH_SECONDS;
}

function deletionMode(role, memberCount) {
  if (role === 'owner') {
    return memberCount <= 1 ? 'family' : 'transfer-required';
  }
  if (role === 'guardian') {
    return 'membership';
  }
  return 'denied';
}

module.exports = { FAMILY_CREATED_BY_COLLECTIONS, RECENT_AUTH_SECONDS, deletionMode, hasRecentVerifiedAuth };
