'use strict';

module.exports = function healthHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET or HEAD for health checks.' } }));
    return;
  }
  res.statusCode = 200;
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok', service: 'studygps', schema_version: '1.0', explanation_mode: 'template' }));
};
