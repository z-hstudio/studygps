'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { generateExamples } = require('../engine/scripts/demo');
const { buildBundle } = require('../engine/scripts/build-n8n');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');

function buildWeb() {
  // public/ is generated output, never an authored source directory.
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  const pages = [
    'index.html', 'home.css', 'home.js',
    'demo.html', 'app.js', 'styles.css', 'presentation.js',
    'portal.html', 'portal.css', 'portal.js',
    'navigation-ui.js', 'navigation.css', 'navigation-demo.js', 'navigation-demo.css',
    'study-audio.js', 'study-audio.css',
    'pricing.html', 'pricing.css', 'pricing.js', 'favicon.svg',
  ];
  for (const name of pages) fs.copyFileSync(path.join(root, 'web', name), path.join(output, name));
  fs.cpSync(path.join(root, 'web/assets'), path.join(output, 'assets'), { recursive: true });
  require('esbuild').buildSync({ entryPoints: [path.join(root, 'web/auth-client.js')], bundle: true, minify: true, platform: 'browser', target: ['es2022'], format: 'iife', outfile: path.join(output, 'auth-client.js') });
  const units = JSON.parse(fs.readFileSync(path.join(root, 'web/learning-content.json'), 'utf8'));
  // These signatures belong to the authored translations, not to whatever course
  // configuration happens to be supplied later. A changed source must be reviewed.
  const signatures = JSON.parse(fs.readFileSync(path.join(root, 'web/learning-sources.json'), 'utf8'));
  fs.writeFileSync(path.join(output, 'learning-content.js'), `'use strict';\nwindow.StudyGPSLearning = ${JSON.stringify({ units, signatures })};\n`);
  fs.mkdirSync(path.join(output, 'examples'), { recursive: true });
  for (const example of generateExamples()) {
    for (const kind of ['request', 'output']) fs.writeFileSync(path.join(output, 'examples', `${example.name}.${kind}.json`), `${JSON.stringify(example[kind], null, 2)}\n`);
  }
  fs.cpSync(path.join(root, 'engine/examples/resources'), path.join(output, 'engine/examples/resources'), { recursive: true });
  fs.mkdirSync(path.join(output, 'downloads'), { recursive: true });
  fs.writeFileSync(path.join(output, 'downloads/n8n-code-node.js'), buildBundle());
  for (const name of ['HANDOFF.md', 'HANDOFF.en.md', 'README.md', 'DEMO-GUIDE.md', 'NOVELTY.md']) fs.copyFileSync(path.join(root, 'engine', name), path.join(output, 'downloads', name));
  console.log('Built static demo, generated examples, real resources and n8n download in public/.');
}

if (require.main === module) buildWeb();
module.exports = { buildWeb };
