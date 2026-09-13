'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
try { require('node:process').loadEnvFile(path.resolve(__dirname, '../.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const studyPlan = require('../api/study-plan');
const health = require('../api/health');
const portal = require('../api/portal');
const canvas = require('../api/canvas');
const authConfig = require('../api/auth-config');
const navigationDemo = require('../api/navigation-demo');
const { buildWeb } = require('./build-web');
const staticRoot = path.resolve(__dirname, '../public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

buildWeb();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/study-plan') return studyPlan(req, res);
  if (url.pathname === '/api/health') return health(req, res);
  if (url.pathname === '/api/canvas') return canvas(req, res);
  if (url.pathname === '/api/portal') return portal(req, res);
  if (url.pathname === '/api/auth-config') return authConfig(req, res);
  if (url.pathname === '/api/navigation-demo') return navigationDemo(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method not allowed'); return; }
  let filename;
  const route = { '/': '/index.html', '/portal': '/portal.html', '/demo': '/demo.html', '/pricing': '/pricing.html' }[url.pathname] || url.pathname;
  try { filename = path.resolve(staticRoot, `.${decodeURIComponent(route)}`); } catch { res.writeHead(400); res.end('Invalid path'); return; }
  if (!filename.startsWith(`${staticRoot}${path.sep}`)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await fs.promises.readFile(filename);
    const headers = { 'Content-Type': types[path.extname(filename)] ?? 'application/octet-stream', 'Content-Length': content.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    // Native audio controls need length and byte ranges for duration and seeking.
    if (req.headers.range && req.method === 'GET') {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      let start = range?.[1] ? Number(range[1]) : 0;
      let end = range?.[2] ? Number(range[2]) : content.length - 1;
      if (range && !range[1] && range[2]) { start = Math.max(0, content.length - Number(range[2])); end = content.length - 1; }
      if (!range || (!range[1] && !range[2]) || start >= content.length || end < start) {
        res.writeHead(416, { 'Content-Range': `bytes */${content.length}` }); res.end(); return;
      }
      end = Math.min(end, content.length - 1);
      res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${content.length}` });
      res.end(content.subarray(start, end + 1)); return;
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT || 3040), '127.0.0.1', () => console.log(`StudyGPS local demo: http://127.0.0.1:${server.address().port}`));
