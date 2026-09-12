'use strict';

module.exports = function authConfig(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED' } }));
  }
  // This endpoint deliberately exposes only the Clerk publishable key.
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  res.end(JSON.stringify({ publishableKey, configured: /^pk_(test|live)_/.test(publishableKey), development: publishableKey.startsWith('pk_test_') }));
};
