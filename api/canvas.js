'use strict';
const { createAuthenticator, allowedOrigins } = require('../server/auth');
const { readBody } = require('./portal');
const { PortalError, portalError } = require('../server/errors');
const { createClient } = require('../server/canvas-client');

function createCanvasHandler({ authenticate = createAuthenticator(), clientFactory = createClient, env = process.env } = {}) {
  return async (req, res) => {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('Vercel-CDN-Cache-Control','no-store');
    res.setHeader('CDN-Cache-Control','no-store');
    res.setHeader('Vary','Authorization, Origin');
    try {
      if(req.method !== 'POST') throw portalError(405,'METHOD_NOT_ALLOWED','Use POST.');
      if(!allowedOrigins(env).includes(req.headers.origin) || req.headers['sec-fetch-site'] === 'cross-site') throw portalError(403,'ORIGIN_NOT_ALLOWED','Use the StudyGPS workspace.');
      if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw portalError(415,'UNSUPPORTED_MEDIA_TYPE','Use JSON.');
      const actor = await authenticate(req);
      if(!actor?.id) throw portalError(401,'AUTH_REQUIRED','Sign in first.');
      const input = await readBody(req);
      if(!input || Array.isArray(input) || !['courses','grades'].includes(input.action) || Object.keys(input).some(key=>!['action','canvasToken','courseId'].includes(key)) || typeof input.canvasToken !== 'string' || !input.canvasToken.trim() || input.canvasToken.length > 4096 || /[\r\n]/.test(input.canvasToken)) throw portalError(400,'VALIDATION_ERROR','Invalid Canvas request.');
      if(input.action === 'grades' && (typeof input.courseId !== 'string' || !/^\d+$/.test(input.courseId))) throw portalError(400,'VALIDATION_ERROR','Invalid course ID.');
      const client = clientFactory(input.canvasToken);
      let result;
      try { result = input.action === 'courses' ? { courses: await client.courses() } : await client.grades(input.courseId); }
      catch(error) {
        const status = /Canvas HTTP (401|403|429)/.exec(error.message)?.[1];
        throw portalError(502,status ? `CANVAS_${status}` : 'CANVAS_UNAVAILABLE','Canvas could not complete the read. Check your token, permissions or try later.');
      }
      res.statusCode=200;res.end(JSON.stringify(result));
    } catch(error) {
      const known = error instanceof PortalError;
      res.statusCode=known?error.status:503;
      res.end(JSON.stringify({error:{code:known?error.code:'SERVICE_UNAVAILABLE',message:known?error.message:'Canvas integration is temporarily unavailable.'}}));
    }
  };
}
module.exports = createCanvasHandler();
module.exports.createCanvasHandler = createCanvasHandler;
