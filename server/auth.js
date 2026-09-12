'use strict';

const { portalError } = require('./errors');

function allowedOrigins(env = process.env) {
  const origins = [];
  if (env.APP_ORIGIN) {
    try {
      const url = new URL(env.APP_ORIGIN);
      if (url.protocol === 'https:' || (env.NODE_ENV !== 'production' && url.protocol === 'http:')) origins.push(url.origin);
    } catch { /* Invalid configuration fails closed below. */ }
  }
  if (env.NODE_ENV !== 'production' && env.VERCEL !== '1') origins.push('http://localhost:3040', 'http://127.0.0.1:3040');
  return [...new Set(origins)];
}

function createAuthenticator({ env = process.env, client } = {}) {
  let clerk = client;
  return async function authenticate(req) {
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization) || authorization.length > 16384) {
      throw portalError(401, 'AUTH_REQUIRED', 'Sign in to access your learning workspace.');
    }
    const origins = allowedOrigins(env);
    if (!origins.length || (!env.CLERK_SECRET_KEY && !client)) throw portalError(503, 'SERVICE_UNAVAILABLE', 'Account authentication is not configured.');
    if (!clerk) {
      const { createClerkClient } = require('@clerk/backend');
      clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY || env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });
    }
    let auth;
    try {
      // Forward only the Bearer header: ambient cookies and client-supplied role fields are never credentials.
      const request = new Request(`${origins[0]}/api/portal`, { headers: { Authorization: authorization } });
      const state = await clerk.authenticateRequest(request, { authorizedParties: origins, acceptsToken: 'session_token' });
      auth = state.toAuth();
      if (!auth || auth.tokenType !== 'session_token' || !auth.userId || !auth.sessionId || !origins.includes(auth.sessionClaims?.azp) || auth.sessionClaims?.sts === 'pending') throw new Error('Invalid session');
    } catch {
      throw portalError(401, 'AUTH_INVALID', 'Your session is invalid or expired. Sign in again.');
    }
    let user;
    try {
      // Fetch every request so revoking teacher access does not wait for JWT metadata refresh.
      user = await clerk.users.getUser(auth.userId);
    } catch (error) {
      if (error.status === 404) throw portalError(401, 'AUTH_INVALID', 'Your account is no longer available.');
      throw portalError(503, 'SERVICE_UNAVAILABLE', 'Unable to verify your account. Try again shortly.');
    }
    if (!user || user.id !== auth.userId || user.banned || user.locked) throw portalError(401, 'AUTH_INVALID', 'Your account is not available.');
    const primaryEmail = user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId && email.verification?.status === 'verified');
    const administratorEmail = (env.STUDYGPS_ADMIN_EMAIL || '').trim().toLowerCase();
    const isAdministrator = Boolean(administratorEmail && primaryEmail?.emailAddress?.trim().toLowerCase() === administratorEmail);
    return {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim().slice(0, 80) || 'Learner',
      email: primaryEmail?.emailAddress ?? '',
      role: isAdministrator || user.privateMetadata?.studygpsRole === 'teacher' ? 'teacher' : 'student',
    };
  };
}

module.exports = { allowedOrigins, createAuthenticator };
