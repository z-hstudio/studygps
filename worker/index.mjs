import { Readable } from 'node:stream';
import health from '../api/health.js';
import studyPlan from '../api/study-plan.js';
import navigationDemo from '../api/navigation-demo.js';
import portalModule from '../api/portal.js';
import canvasModule from '../api/canvas.js';
import auth from '../server/auth.js';
import repository from '../server/repository.js';
import vercelConfig from '../vercel.json' with { type: 'json' };

const security = Object.fromEntries(vercelConfig.headers[0].headers.map(({key,value})=>[key,value]));
export async function handleApi(request, handler) {
  const req = request.body ? Readable.fromWeb(request.body) : Readable.from([]);
  req.method = request.method;
  const url = new URL(request.url);
  req.url = url.pathname + url.search;
  req.headers = Object.fromEntries(request.headers);
  req.on('error',()=>{});
  const headers = new Headers(security);
  let response;
  const res = {
    statusCode:200,
    setHeader(name,value){headers.set(name,value);},
    end(body){response=new Response(request.method==='HEAD'||[204,304].includes(this.statusCode)?null:body,{status:this.statusCode,headers});},
  };
  try { await handler(req,res); return response || new Response(null,{status:500,headers}); }
  catch { return Response.json({error:{code:'SERVICE_UNAVAILABLE',message:'Service temporarily unavailable.'}},{status:503,headers:{...security,'Cache-Control':'private, no-store'}}); }
  finally { req.destroy(); }
}
export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if(pathname==='/api/health')return handleApi(request,health);
    if(pathname==='/api/study-plan')return handleApi(request,studyPlan);
    if(pathname==='/api/navigation-demo')return handleApi(request,navigationDemo);
    if(pathname==='/api/auth-config'){
      if(request.method!=='GET')return Response.json({error:{code:'METHOD_NOT_ALLOWED'}},{status:405,headers:{...security,Allow:'GET','Cache-Control':'no-store'}});
      const key = env.CLERK_PUBLISHABLE_KEY || '';
      // Do not offer sign-in when the backend cannot open the authenticated workspace.
      const configured = /^pk_(test|live)_/.test(key) && Boolean(env.CLERK_SECRET_KEY && env.DATABASE_URL);
      return Response.json({publishableKey:configured?key:'',configured,development:key.startsWith('pk_test_')},{headers:{...security,'Cache-Control':'no-store'}});
    }
    if(pathname==='/api/deployment')return Response.json({host:'cloudflare',source:env.SOURCE_COMMIT||'unknown',accountConfigured:Boolean(env.CLERK_PUBLISHABLE_KEY&&env.CLERK_SECRET_KEY&&env.DATABASE_URL)},{headers:{...security,'Cache-Control':'no-store'}});
    if(pathname==='/api/portal')return handleApi(request,portalModule.createPortalHandler({env,authenticate:auth.createAuthenticator({env}),repository:repository.createRepository({env})}));
    if(pathname==='/api/canvas')return handleApi(request,canvasModule.createCanvasHandler({env,authenticate:auth.createAuthenticator({env})}));
    if(pathname.startsWith('/api/'))return Response.json({error:{code:'NOT_FOUND'}},{status:404,headers:{...security,'Cache-Control':'no-store'}});
    const alias={'/':'/index.html','/portal':'/portal.html','/pricing':'/pricing.html','/demo':'/demo.html'}[pathname];
    if(alias)url.pathname=alias;
    return env.ASSETS.fetch(new Request(url,request));
  }
};
