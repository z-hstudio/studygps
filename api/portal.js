'use strict';

const { createAuthenticator, allowedOrigins } = require('../server/auth');
const { createRepository } = require('../server/repository');
const { createPortalService } = require('../server/portal-service');
const { portalError, PortalError } = require('../server/errors');
const MAX_BODY_BYTES = 32 * 1024;

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const tooLarge = () => portalError(413, 'PAYLOAD_TOO_LARGE', 'JSON request must not exceed 32 KiB.');
  const badJson = () => portalError(400, 'INVALID_JSON', 'Request body must contain valid JSON.');
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) { req.resume?.(); throw tooLarge(); }
  let supplied;
  try { supplied = req.body; } catch { throw badJson(); }
  if (supplied !== undefined) {
    let raw;
    try { raw = Buffer.isBuffer(supplied) ? supplied.toString('utf8') : typeof supplied === 'string' ? supplied : JSON.stringify(supplied); } catch { throw badJson(); }
    if (Buffer.byteLength(raw ?? '', 'utf8') > MAX_BODY_BYTES) throw tooLarge();
    try { return JSON.parse(raw); } catch { throw badJson(); }
  }
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    const cleanup = () => {
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      req.removeListener('aborted', onError);
    };
    const onError = () => { cleanup(); reject(badJson()); };
    const onData = (chunk) => {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += value.length;
      if (bytes > MAX_BODY_BYTES) {
        cleanup();
        // Drain without destroying the request socket, so callers receive 413.
        req.resume?.();
        reject(tooLarge());
      } else chunks.push(value);
    };
    const onEnd = () => { cleanup(); resolve(Buffer.concat(chunks).toString('utf8')); };
    req.on('data', onData); req.on('end', onEnd); req.on('error', onError); req.on('aborted', onError);
  });
  try { return JSON.parse(raw); } catch { throw badJson(); }
}

function createPortalHandler({ authenticate = createAuthenticator(), repository = createRepository(), env = process.env } = {}) {
  const service = createPortalService({ repository });
  return async function portalHandler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Authorization, Origin');
    try {
      if (!['GET', 'POST'].includes(req.method)) {
        res.setHeader('Allow', 'GET, POST');
        throw portalError(405, 'METHOD_NOT_ALLOWED', 'Use GET or POST.');
      }
      let payload;
      if (req.method === 'POST') {
        if (!allowedOrigins(env).includes(req.headers.origin) || req.headers['sec-fetch-site'] === 'cross-site') throw portalError(403, 'ORIGIN_NOT_ALLOWED', 'Use the StudyGPS website to update learning records.');
        if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type'] ?? '')) throw portalError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.');
        payload = await readBody(req);
      }
      const actor = await authenticate(req);
      if (!actor?.id || !['student', 'teacher'].includes(actor.role)) throw portalError(401, 'AUTH_INVALID', 'Sign in to access your workspace.');
      const url = new URL(req.url || '/api/portal', 'https://studygps.invalid');
      if ([...url.searchParams.keys()].some((key) => key !== 'studentId') || url.searchParams.getAll('studentId').length > 1) throw portalError(400, 'VALIDATION_ERROR', 'Unsupported query parameters.');
      if (req.method === 'POST' && url.searchParams.has('studentId')) throw portalError(400, 'VALIDATION_ERROR', 'Mutation targets belong in the validated action body.');
      const result = req.method === 'GET' ? await service.view(actor, url.searchParams.has('studentId') ? url.searchParams.get('studentId') : null) : await service.mutate(actor, payload);
      send(res, 200, result);
    } catch (error) {
      const expected = error instanceof PortalError;
      send(res, expected ? error.status : 503, { error: {
        code: expected ? error.code : 'SERVICE_UNAVAILABLE',
        message: expected ? error.message : 'Your learning workspace is temporarily unavailable. Please try again.',
      } });
    }
  };
}

module.exports = createPortalHandler();
module.exports.createPortalHandler = createPortalHandler;
module.exports.readBody = readBody;
