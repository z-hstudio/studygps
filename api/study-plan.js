'use strict';

const { runCodeNode } = require('../engine/n8n-adapter');
const MAX_BODY_BYTES = 256 * 1024;

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function payloadError(code, message, status) {
  return Object.assign(new Error(message), { code, status });
}

async function readBody(req) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    req.resume?.();
    throw payloadError('PAYLOAD_TOO_LARGE', 'JSON request must not exceed 256 KiB.', 413);
  }
  let parsed;
  try { parsed = req.body; } catch {
    throw payloadError('INVALID_JSON', 'Request body must contain valid JSON.', 400);
  }
  if (parsed !== undefined) {
    const raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    if (Buffer.byteLength(raw ?? '', 'utf8') > MAX_BODY_BYTES) throw payloadError('PAYLOAD_TOO_LARGE', 'JSON request must not exceed 256 KiB.', 413);
    if (Buffer.isBuffer(parsed) || typeof parsed === 'string') {
      try { return JSON.parse(raw); } catch { throw payloadError('INVALID_JSON', 'Request body must contain valid JSON.', 400); }
    }
    return parsed;
  }
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    const cleanup = () => {
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      req.removeListener('aborted', onAborted);
    };
    const onError = () => { cleanup(); reject(payloadError('INVALID_JSON', 'Could not read the JSON request.', 400)); };
    const onAborted = () => { cleanup(); reject(payloadError('INVALID_JSON', 'JSON request was interrupted.', 400)); };
    const onData = (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_BODY_BYTES) {
        cleanup();
        req.resume();
        reject(payloadError('PAYLOAD_TOO_LARGE', 'JSON request must not exceed 256 KiB.', 413));
      } else chunks.push(buffer);
    };
    const onEnd = () => { cleanup(); resolve(Buffer.concat(chunks).toString('utf8')); };
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('aborted', onAborted);
  });
  try { return JSON.parse(raw); } catch { throw payloadError('INVALID_JSON', 'Request body must contain valid JSON.', 400); }
}

module.exports = async function studyPlanHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    send(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST with an application/json request.' } });
    return;
  }
  if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type'] ?? '')) {
    send(res, 415, { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json.' } });
    return;
  }
  try {
    const payload = await readBody(req);
    send(res, 200, runCodeNode([{ json: payload }])[0].json);
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') send(res, 400, { error: { code: error.code, message: error.message, issues: error.issues } });
    else if (error.status) send(res, error.status, { error: { code: error.code, message: error.message } });
    else send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Unable to generate a study plan.' } });
  }
};
