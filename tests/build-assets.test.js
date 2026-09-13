'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
let fixture, output;
const pages = ['index.html', 'demo.html', 'portal.html', 'pricing.html'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function files(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? files(path.join(directory, entry.name), name + '/') : [name];
  }).sort();
}
function targetFor(reference, source) {
  const url = new URL(reference, 'https://studygps.test/' + source);
  if (url.origin !== 'https://studygps.test') return null;
  const route = { '/': '/index.html', '/demo': '/demo.html', '/portal': '/portal.html', '/pricing': '/pricing.html' }[url.pathname] || url.pathname;
  return { file: path.join(output, decodeURIComponent(route)), hash: decodeURIComponent(url.hash.slice(1)) };
}

test.before(() => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'studygps-build-test-'));
  for (const directory of ['web', 'engine', 'src', 'data']) fs.cpSync(path.join(root, directory), path.join(fixture, directory), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts/build-web.js'), path.join(fixture, 'scripts/build-web.js'));
  // Build in isolation so the regression test never clears a dev server's public/.
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
  fs.mkdirSync(path.join(fixture, 'public'));
  for (const relative of ['.env.local', 'web/.env.local', 'web/private.test.js', 'public/.env.local']) {
    fs.writeFileSync(path.join(fixture, relative), 'BUILD_TEST_SECRET_MUST_NOT_BE_PUBLISHED');
  }
  const result = spawnSync(process.execPath, [path.join(fixture, 'scripts/build-web.js')], { cwd: fixture, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  output = path.join(fixture, 'public');
});
test.after(() => { if (fixture) fs.rmSync(fixture, { recursive: true, force: true }); });

test('build publishes all four pages and their local resources and anchors without placeholder CTAs', () => {
  for (const page of pages) {
    const dom = new JSDOM(fs.readFileSync(path.join(output, page), 'utf8'));
    try {
      for (const node of dom.window.document.querySelectorAll('[href], [src]')) {
        const reference = node.getAttribute('href') ?? node.getAttribute('src');
        assert.ok(reference && reference !== '#' && !/^javascript:/i.test(reference), `${page}: empty or inactive link`);
        const target = targetFor(reference, page);
        if (!target) continue;
        assert.ok(fs.existsSync(target.file), `${page}: ${reference} is absent from the build`);
        if (target.hash && path.extname(target.file) === '.html') {
          const destination = new JSDOM(fs.readFileSync(target.file, 'utf8'));
          try { assert.ok(destination.window.document.getElementById(target.hash), `${page}: missing ${reference} anchor`); }
          finally { destination.window.close(); }
        }
      }
    } finally { dom.window.close(); }
  }
  for (const css of files(output).filter(file => file.endsWith('.css'))) {
    for (const match of fs.readFileSync(path.join(output, css), 'utf8').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      const target = targetFor(match[1], css);
      if (target) assert.ok(fs.existsSync(target.file), `${css}: missing ${match[1]}`);
    }
  }
});

test('build excludes environment files, stale output, tests and server sources', () => {
  const published = files(output);
  const topLevel = [
    ...pages, 'home.css', 'home.js', 'app.js', 'styles.css', 'presentation.js', 'portal.css', 'portal.js',
    'navigation-ui.js', 'navigation.css', 'navigation-demo.js', 'navigation-demo.css', 'study-audio.js',
    'study-audio.css', 'pricing.css', 'pricing.js', 'favicon.svg', 'auth-client.js', 'learning-content.js',
  ];
  const allowed = /^(?:assets\/(?:studygps-navigation-hero\.png|audio\/(?:manifest\.json|(?:first-law|second-law|entropy|rankine-cycle)\.wav))|examples\/(?:alex-assessment-[12]|sarah-assessment-1)\.(?:request|output)\.json|engine\/examples\/resources\/(?:first-law|second-law|entropy|rankine-cycle)\.md|downloads\/(?:n8n-code-node\.js|HANDOFF(?:\.en)?\.md|README\.md|DEMO-GUIDE\.md|NOVELTY\.md))$/;
  for (const file of published) {
    assert.ok(topLevel.includes(file) || allowed.test(file), `Unreviewed public artifact: ${file}`);
    assert.doesNotMatch(file, /(?:^|\/)\.|\.test\.|\.map$|(?:^|\/)(?:tests?|server|node_modules)\//);
    if (!/\.(?:png|wav)$/.test(file)) assert.ok(!fs.readFileSync(path.join(output, file), 'utf8').includes('BUILD_TEST_SECRET_MUST_NOT_BE_PUBLISHED'), `Fixture secret leaked into ${file}`);
  }
  for (const page of pages) assert.ok(published.includes(page));
});

test('published audio and linked practice resources match their manifest hashes', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'assets/audio/manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), ['entropy', 'first_law', 'rankine_cycle', 'second_law']);
  for (const [topic, entry] of Object.entries(manifest)) {
    const wave = fs.readFileSync(targetFor(entry.src, 'index.html').file);
    assert.equal(hash(wave), entry.sha256, `${topic}: audio changed without manifest update`);
    assert.equal(wave.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wave.toString('ascii', 8, 12), 'WAVE');
    assert.equal(hash(fs.readFileSync(path.join(output, entry.resource))), entry.resourceSha256, `${topic}: practice text changed without audio review`);
  }
});
