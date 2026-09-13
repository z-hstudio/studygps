'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const origin='https://study-gps.z-hstudio.com';
const env={APP_ORIGIN:origin,NODE_ENV:'production'};
const load=()=>import('../worker/index.mjs');
test('Cloudflare runs the same public engine and preserves query strings',async()=>{
  const {default:worker}=await load();
  const sample=require('../engine/examples/alex-assessment-1.request.json');
  const expected=require('../engine/examples/alex-assessment-1.output.json');
  const response=await worker.fetch(new Request(origin+'/api/study-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)}),env);
  assert.equal(response.status,200);assert.deepEqual(await response.json(),expected);
  const navigation=await worker.fetch(new Request(origin+'/api/navigation-demo?preset=sarah1'),env);
  assert.equal(navigation.status,200);const payload=await navigation.json();assert.equal(payload.learner,'Sarah · Assessment 1');assert.equal(payload.overallScore,63.5);
});
test('Cloudflare account and Canvas endpoints fail closed without configuration or authentication',async()=>{
  const {default:worker}=await load();
  const config=await (await worker.fetch(new Request(origin+'/api/auth-config'),env)).json();assert.equal(config.configured,false);assert.equal(config.publishableKey,'');
  for(const path of ['/api/portal','/api/canvas']){
    const response=await worker.fetch(new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}),env);
    assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/);
  }
  const bad=await worker.fetch(new Request(origin+'/api/canvas',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'}),env);assert.equal(bad.status,403);
});
test('Cloudflare preserves aliases and rejects unknown API routes',async()=>{
  const {default:worker}=await load();let seen;
  await worker.fetch(new Request(origin+'/pricing?lang=en'),{...env,ASSETS:{fetch:async req=>{seen=req.url;return new Response('page');}}});assert.equal(seen,origin+'/pricing.html?lang=en');
  await worker.fetch(new Request(origin+'/'),{...env,ASSETS:{fetch:async req=>{seen=req.url;return new Response('home');}}});assert.equal(seen,origin+'/index.html');
  assert.equal((await worker.fetch(new Request(origin+'/api/not-real'),env)).status,404);
});
