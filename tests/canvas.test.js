'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvasHandler}=require('../api/canvas');
const {createClient,normalizeAssignment}=require('../server/canvas-client');
const {portalError}=require('../server/errors');
const origin='https://studygps.example';
function fixture(){
  const calls=[];
  const handler=createCanvasHandler({env:{NODE_ENV:'production',APP_ORIGIN:origin},authenticate:async req=>{if(req.headers.authorization!=='Bearer session')throw portalError(401,'AUTH_REQUIRED','Sign in');return{id:'student-a'};},clientFactory:token=>({courses:async()=>{calls.push(token);return[{id:'9',name:'Fictional course'}];},grades:async id=>({course:{id},assignments:[]})})});
  const call=async (body={action:'courses',canvasToken:'fictional-token'},headers={},method='POST')=>{const req={method,body,headers:{authorization:'Bearer session',origin,'content-type':'application/json',...headers}};const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(s){this.body=JSON.parse(s);}};await handler(req,res);return res;};
  return{calls,call};
}
test('Canvas route requires existing website authentication and same origin',async()=>{
  const {call,calls}=fixture();assert.equal((await call(undefined,{authorization:''})).statusCode,401);assert.equal((await call(undefined,{origin:'https://evil.test'})).statusCode,403);assert.equal((await call(undefined,{},'GET')).statusCode,405);assert.equal(calls.length,0);
});
test('Canvas route rejects ownership overrides and does not return credentials',async()=>{
  const {call,calls}=fixture();assert.equal((await call({action:'courses',canvasToken:'fictional-token',studentId:'other'})).statusCode,400);
  const response=await call();assert.equal(response.statusCode,200);assert.equal(response.headers['Cache-Control'],'private, no-store');assert.equal(JSON.stringify(response.body).includes('fictional-token'),false);assert.deepEqual(calls,['fictional-token']);
});
test('Read adapter respects active enrollment, pagination and credential destination',async()=>{
  let count=0;const client=createClient('fictional-token',async(url,options)=>{count++;assert.equal(new URL(url).searchParams.get('enrollment_state'),'active');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');return new Response('[]',{headers:{link:'<https://evil.test/api/v1/courses>; rel="next"'}});});await assert.rejects(client.courses());assert.equal(count,1);
});
test('Canvas grade normalization keeps unknown distinct from real zero',()=>{
  const make=(score,points=10)=>normalizeAssignment({id:1,assignment_group_id:2,points_possible:points,submission:{score}});
  assert.equal(make(null).eligible_score,null);assert.equal(make(0).eligible_score,0);assert.equal(make(7).eligible_score,70);assert.equal(make(11).eligible_score,null);assert.equal(make(1,0).eligible_score,null);
});
test('Canvas widget syncs all courses within the existing workspace and clears on identity change',async()=>{
  const {JSDOM}=require('jsdom');const fs=require('node:fs');const dom=new JSDOM('<div id="host"></div>',{runScripts:'outside-only'}),w=dom.window;w.eval(fs.readFileSync('web/canvas.js','utf8'));
  const host=w.document.getElementById('host'),calls=[];
  const request=async(route,options)=>{const body=JSON.parse(options.body);calls.push(body);return body.action==='courses'?{courses:[{id:'1',name:'Course A'},{id:'2',name:'Course B'}]}:{course:{id:body.courseId},assignments:[]};};
  w.StudyGPSCanvas.mount(host,{userId:'a',locale:'en',request});w.document.getElementById('canvas-token').value='fictional-token';host.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await new Promise(r=>setImmediate(r));assert.deepEqual(calls.filter(c=>c.courseId).map(c=>c.courseId),['1','2']);assert.match(host.textContent,/2 succeeded/);assert.equal(w.document.getElementById('canvas-token').value,'');
  host.replaceChildren();w.StudyGPSCanvas.mount(host,{userId:'a',locale:'zh',request});assert.match(host.textContent,/Course A/);assert.match(host.textContent,/我的 Canvas 课程/);
  host.replaceChildren();w.StudyGPSCanvas.mount(host,{userId:'b',locale:'en',request});assert.doesNotMatch(host.textContent,/Course A/);w.StudyGPSCanvas.clear();dom.window.close();
});
test('A late Canvas response cannot restore data after sign-out',async()=>{
  const {JSDOM}=require('jsdom');const fs=require('node:fs');const dom=new JSDOM('<div id="host"></div>',{runScripts:'outside-only'}),w=dom.window;w.eval(fs.readFileSync('web/canvas.js','utf8'));const host=w.document.getElementById('host');let finish;
  w.StudyGPSCanvas.mount(host,{userId:'a',locale:'en',request:()=>new Promise(resolve=>{finish=resolve;})});w.document.getElementById('canvas-token').value='fictional-token';host.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));w.StudyGPSCanvas.clear();host.replaceChildren();finish({courses:[{id:'1',name:'Private course'}]});await new Promise(r=>setImmediate(r));assert.equal(host.textContent,'');dom.window.close();
});
