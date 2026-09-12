'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
try { require('node:process').loadEnvFile(path.resolve(__dirname, '../.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const studyPlan = require('../api/study-plan');
const health = require('../api/health');
const portal = require('../api/portal');
const authConfig = require('../api/auth-config');
const { buildWeb } = require('./build-web');
const staticRoot = path.resolve(__dirname, '../public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

buildWeb();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/study-plan') return studyPlan(req, res);
  if (url.pathname === '/api/health') return health(req, res);
  if (url.pathname === '/api/portal') return portal(req, res);
  if (url.pathname === '/api/auth-config') return authConfig(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method not allowed'); return; }
  let filename;
  try { filename = path.resolve(staticRoot, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`); } catch { res.writeHead(400); res.end('Invalid path'); return; }
  if (!filename.startsWith(`${staticRoot}${path.sep}`)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await fs.promises.readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT || 3040), '127.0.0.1', () => console.log(`StudyGPS local demo: http://127.0.0.1:${server.address().port}`));
