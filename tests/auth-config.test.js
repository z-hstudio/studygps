'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/auth-config');

test('authentication configuration exposes only public fields and never server credentials', () => {
  const original = {...process.env};
  try {
    process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_public';
    process.env.CLERK_SECRET_KEY = 'private-credential-never-ship';
    process.env.DATABASE_URL = 'postgresql://private-database';
    process.env.STUDYGPS_ADMIN_EMAIL = 'private-admin@example.com';
    const headers = {};
    let raw;
    handler({method:'GET'},{setHeader:(key,value)=>{headers[key]=value;},end:value=>{raw=value;}});
    assert.deepEqual(JSON.parse(raw), {publishableKey:'pk_test_public',configured:true,development:true});
    assert.match(headers['Cache-Control'],/no-store/);
    for (const secret of ['private-credential','private-database','private-admin']) assert.ok(!raw.includes(secret));
  } finally {
    for(const key of Object.keys(process.env)) if(!(key in original)) delete process.env[key];
    Object.assign(process.env,original);
  }
});
