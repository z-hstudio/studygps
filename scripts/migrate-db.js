'use strict';

const fs = require('node:fs');
const path = require('node:path');

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Load your local environment before running this script.');
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  const migration = fs.readFileSync(path.join(__dirname, '../database/001-portal.sql'), 'utf8');
  // This is an owned static migration file, never request content. Split statements
  // so the HTTP driver's parameterized protocol runs the whole migration atomically.
  const statements = migration.split(';').map((statement) => statement.trim()).filter(Boolean);
  await sql.transaction(statements.map((statement) => sql.query(statement, [])));
  process.stdout.write(`StudyGPS database migration complete (${statements.length} statements).\n`);
}

if (require.main === module) migrate().catch(() => {
  // Database errors can contain connection details; do not print them to a shared log.
  process.stderr.write('StudyGPS database migration failed. Verify DATABASE_URL and database availability.\n');
  process.exitCode = 1;
});

module.exports = { migrate };
