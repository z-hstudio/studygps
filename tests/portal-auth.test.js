'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, sign } = require('node:crypto');
const { createAuthenticator, allowedOrigins } = require('../server/auth');
const ORIGIN = 'https://studygps.example.test';
const environment = { NODE_ENV: 'production', APP_ORIGIN: ORIGIN };

function clerkUser(overrides = {}) {
  return { id: 'user_verified', firstName: 'Verified', lastName: 'Learner', primaryEmailAddressId: 'email_primary', emailAddresses: [{ id: 'email_primary', emailAddress: 'verified@example.test', verification: { status: 'verified' } }], privateMetadata: {}, ...overrides };
}
function harness(user = clerkUser(), state = {}) {
  let reads = 0;
  let options;
  let headers;
  return {
    get reads() { return reads; }, get options() { return options; }, get headers() { return headers; },
    client: {
      async authenticateRequest(request, input) {
        options = input; headers = request.headers;
        return { toAuth: () => ({ tokenType: 'session_token', userId: 'user_verified', sessionId: 'sess_verified', sessionClaims: { azp: ORIGIN }, ...state }) };
      },
      users: { async getUser(id) { reads += 1; assert.equal(id, 'user_verified'); return user; } },
    },
  };
}
const request = (authorization = 'Bearer valid.jwt.token') => ({ headers: { authorization, cookie: '__session=ambient-cookie' } });

test('authentication requires an explicit Bearer token and forwards no ambient cookie', async () => {
  const fake = harness();
  const authenticate = createAuthenticator({ env: environment, client: fake.client });
  for (const authorization of [undefined, '', 'Basic abc', 'Bearer a b', ['Bearer abc']]) await assert.rejects(authenticate({ headers: { authorization } }), { status: 401 });
  await assert.rejects(authenticate({ headers: { cookie: '__session=valid.jwt.token' } }), { status: 401 });
  const actor = await authenticate(request());
  assert.equal(actor.id, 'user_verified');
  assert.equal(actor.role, 'student');
  assert.equal(fake.headers.get('Cookie'), null);
  assert.equal(fake.options.acceptsToken, 'session_token');
  assert.deepEqual(fake.options.authorizedParties, [ORIGIN]);
});

test('teacher role uses fresh private metadata and ignores public, unsafe and JWT role claims', async () => {
  const user = clerkUser({ publicMetadata: { studygpsRole: 'teacher' }, unsafeMetadata: { studygpsRole: 'teacher' } });
  const fake = harness(user, { sessionClaims: { azp: ORIGIN, role: 'teacher', metadata: { studygpsRole: 'teacher' } } });
  const authenticate = createAuthenticator({ env: environment, client: fake.client });
  assert.equal((await authenticate(request())).role, 'student');
  user.privateMetadata.studygpsRole = 'teacher';
  assert.equal((await authenticate(request())).role, 'teacher');
  delete user.privateMetadata.studygpsRole;
  assert.equal((await authenticate(request())).role, 'student');
  assert.equal(fake.reads, 3);
});

test('only the verified current primary email is shared with the learning profile', async () => {
  const fake = harness(clerkUser({ primaryEmailAddressId: 'email_unverified', emailAddresses: [
    { id: 'email_old', emailAddress: 'old@example.test', verification: { status: 'verified' } },
    { id: 'email_unverified', emailAddress: 'new@example.test', verification: { status: 'unverified' } },
  ] }));
  assert.equal((await createAuthenticator({ env: environment, client: fake.client })(request())).email, '');
});

test('administrator bootstrap matches only the server-configured verified primary address', async () => {
  const env = { ...environment, STUDYGPS_ADMIN_EMAIL: '  Verified@Example.Test ' };
  const good = harness(clerkUser());
  assert.equal((await createAuthenticator({ env, client: good.client })(request())).role, 'teacher');
  const cases = [
    [{ id: 'email_primary', emailAddress: 'verified@example.test', verification: { status: 'unverified' } }],
    [{ id: 'email_primary', emailAddress: 'verified+extra@example.test', verification: { status: 'verified' } }],
    [{ id: 'email_secondary', emailAddress: 'verified@example.test', verification: { status: 'verified' } }, { id: 'email_primary', emailAddress: 'someone@example.test', verification: { status: 'verified' } }],
  ];
  for (const emailAddresses of cases) {
    const fake = harness(clerkUser({ emailAddresses, unsafeMetadata: { email: 'verified@example.test' } }));
    assert.equal((await createAuthenticator({ env, client: fake.client })(request())).role, 'student');
  }
  const empty = harness(clerkUser({ emailAddresses: [] }));
  assert.equal((await createAuthenticator({ env: { ...environment, STUDYGPS_ADMIN_EMAIL: '' }, client: empty.client })(request())).role, 'student');
});

test('missing origin, foreign origin, machine tokens and pending sessions are rejected', async () => {
  for (const state of [
    { sessionClaims: {} }, { sessionClaims: { azp: 'https://evil.example' } },
    { tokenType: 'oauth_token' }, { tokenType: 'api_key' }, { tokenType: 'm2m_token' },
    { sessionId: null }, { userId: null }, { sessionClaims: { azp: ORIGIN, sts: 'pending' } },
  ]) {
    const fake = harness(clerkUser(), state);
    await assert.rejects(createAuthenticator({ env: environment, client: fake.client })(request()), { status: 401 });
    assert.equal(fake.reads, 0);
  }
});

test('banned, locked, deleted and mismatched users cannot authenticate', async () => {
  for (const user of [clerkUser({ banned: true }), clerkUser({ locked: true }), clerkUser({ id: 'user_other' }), null]) {
    const fake = harness(user);
    await assert.rejects(createAuthenticator({ env: environment, client: fake.client })(request()), { status: 401 });
  }
  const fake = harness();
  fake.client.users.getUser = async () => { throw Object.assign(new Error('private account detail'), { status: 404 }); };
  await assert.rejects(createAuthenticator({ env: environment, client: fake.client })(request()), { status: 401 });
});

test('Clerk availability failures return a generic error without upstream secret text', async () => {
  const fake = harness();
  fake.client.users.getUser = async () => { throw new Error('secret service credential'); };
  await assert.rejects(createAuthenticator({ env: environment, client: fake.client })(request()), (error) => error.status === 503 && !error.message.includes('secret'));
});

test('production origin allowlist cannot be derived from request headers and fails closed when absent', async () => {
  assert.deepEqual(allowedOrigins({ NODE_ENV: 'production' }), []);
  assert.deepEqual(allowedOrigins({ NODE_ENV: 'production', APP_ORIGIN: 'http://evil.test' }), []);
  assert.deepEqual(allowedOrigins({ NODE_ENV: 'production', APP_ORIGIN: ORIGIN }), [ORIGIN]);
  assert.deepEqual(allowedOrigins({ VERCEL: '1' }), []);
  assert.ok(allowedOrigins({}).includes('http://localhost:3040'));
  await assert.rejects(createAuthenticator({ env: { NODE_ENV: 'production' }, client: harness().client })(request()), { status: 503 });
});

test('actual Clerk SDK verifies signatures and denies forged, expired and wrong-origin JWTs', async () => {
  const { createClerkClient } = require('@clerk/backend');
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwtKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
  const sdk = createClerkClient({
    secretKey: 'sk_test_unit_verification_only',
    publishableKey: `pk_test_${Buffer.from('studygps-unit.clerk.accounts.dev$').toString('base64')}`,
  });
  const fake = harness();
  fake.client.authenticateRequest = (req, options) => sdk.authenticateRequest(req, { ...options, jwtKey });
  const authenticate = createAuthenticator({ env: environment, client: fake.client });
  const now = Math.floor(Date.now() / 1000);
  function jwt(claims = {}, signingKey = keys.privateKey) {
    const payload = { iss: 'https://studygps-unit.clerk.accounts.dev', sub: 'user_verified', sid: 'sess_verified', azp: ORIGIN, iat: now, nbf: now - 1, exp: now + 60, ...claims };
    const body = [Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'unit-key' })).toString('base64url'), Buffer.from(JSON.stringify(payload)).toString('base64url')].join('.');
    return `${body}.${sign('RSA-SHA256', Buffer.from(body), signingKey).toString('base64url')}`;
  }
  assert.equal((await authenticate(request(`Bearer ${jwt()}`))).id, 'user_verified');
  for (const token of [jwt({}, otherKeys.privateKey), jwt({ exp: now - 120 }), jwt({ nbf: now + 120 }), jwt({ azp: 'https://foreign.example' }), jwt({ azp: undefined }), 'e30.e30.invalid']) await assert.rejects(authenticate(request(`Bearer ${token}`)), { status: 401 });
  assert.equal(fake.reads, 1);
});
