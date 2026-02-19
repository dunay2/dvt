#!/usr/bin/env node
/* eslint-env node */
/* global console, process, URL, __dirname */
/**
 * Database Migration Script
 *
 * Runs SQL migrations for local/CI PostgreSQL environments.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function runMigrations() {
  console.log('🗄️  Running database migrations...\n');

  const dbUrl = process.env.DATABASE_URL;
  const schema = process.env.DVT_PG_SCHEMA || 'dvt';

  if (!dbUrl) {
    throw new Error('DATABASE_URL not set');
  }

  console.log('📍 Database URL:', dbUrl.replace(/:[^:@]+@/, ':***@'));
  console.log('📂 Schema:', schema);

  const url = new URL(dbUrl);
  console.log(`   Protocol: ${url.protocol}`);
  console.log(`   Host: ${url.hostname}:${url.port}`);
  console.log(`   Database: ${url.pathname.substring(1)}`);
  console.log(`   User: ${url.username}`);

  const migrationsDir = path.join(__dirname, '..', 'packages', 'adapter-postgres', 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('ℹ️  No migration files found.');
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    console.log('\n📦 Running migrations:');
    for (const file of migrationFiles) {
      const version = file.replace(/\.sql$/i, '');
      const applied = await client.query(
        `SELECT 1 FROM ${quoteIdentifier(schema)}.schema_migrations WHERE version = $1 LIMIT 1`,
        [version]
      );

      if (applied.rowCount > 0) {
        console.log(`   ↷ ${file} (already applied)`);
        continue;
      }

      const rawSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const sql = rawSql.replaceAll('__SCHEMA__', quoteIdentifier(schema));
      const statements = splitSqlStatements(sql);

      for (const statement of statements) {
        await client.query(statement);
      }

      await client.query(
        `INSERT INTO ${quoteIdentifier(schema)}.schema_migrations(version) VALUES ($1)`,
        [version]
      );
      console.log(`   ✓ ${file}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  console.log('\n✅ Migrations completed');
}

// Run migrations
runMigrations().catch((error) => {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
});
