#!/usr/bin/env node
/** Owned concern: validate DB-governed surface inventory rows, not manual Markdown tables. */
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { textValue } = require('./planning-db/query-format.cjs');
const {
  allowedDbSurfaceMigrationStates,
  allowedDbSurfaceWriteRailKinds,
  readDbSurfaceRows,
  sourceView,
} = require('./planning-db/db-surface-inventory.cjs');

const requiredSurfaces = [
  { surfaceName: 'Governance file inventory', migrationState: 'Hybrid indexed' },
  {
    surfaceName: 'Architecture design authority',
    migrationState: 'DB-first',
    writeRailKind: 'db_command',
  },
  {
    surfaceName: 'Governance component definition',
    migrationState: 'DB-first',
    writeRailKind: 'db_command',
  },
  { surfaceName: 'Governance remediation queue', migrationState: 'Generated-only' },
  { surfaceName: 'ADR and contract decisions', migrationState: 'Git-first indexed' },
  { surfaceName: 'Risk and evidence records', migrationState: 'Git-first indexed' },
  { surfaceName: 'Repository command catalog', migrationState: 'Hybrid indexed' },
  { surfaceName: 'Command/query rail catalog', migrationState: 'Hybrid indexed' },
  { surfaceName: 'Knowledge intake literature', migrationState: 'Hybrid indexed' },
  { surfaceName: 'Documentation lifecycle catalog', migrationState: 'Hybrid indexed' },
  { surfaceName: 'AI project context', migrationState: 'Hybrid indexed' },
  { surfaceName: 'Docs task disposition inventory', migrationState: 'Git-first indexed' },
  {
    surfaceName: 'Docs resolution overlays',
    migrationState: 'DB-first',
    writeRailKind: 'db_command',
  },
];

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function booleanValue(value) {
  return value === true || value === 'true';
}

function normalizeRow(row) {
  return {
    surfaceName: textValue(row.surface_name ?? row.surfaceName, ''),
    canonicalSource: textValue(row.canonical_source ?? row.canonicalSource, ''),
    writeRail: textValue(row.write_rail ?? row.writeRail, ''),
    writeRailKind: textValue(row.write_rail_kind ?? row.writeRailKind, ''),
    readQueryRail: textValue(row.read_query_rail ?? row.readQueryRail, ''),
    projection: textValue(row.projection, ''),
    validation: textValue(row.validation, ''),
    migrationState: textValue(row.migration_state ?? row.migrationState, ''),
    sourceRef: textValue(row.source_ref ?? row.sourceRef, ''),
    sourceContentSha256: textValue(row.source_content_sha256 ?? row.sourceContentSha256, ''),
    dbFirstEligible: booleanValue(row.db_first_eligible ?? row.dbFirstEligible),
    dbFirstBlocker: textValue(row.db_first_blocker ?? row.dbFirstBlocker, ''),
  };
}

function validateRequiredText(row, errors) {
  for (const [field, value] of [
    ['canonical_source', row.canonicalSource],
    ['write_rail', row.writeRail],
    ['read_query_rail', row.readQueryRail],
    ['projection', row.projection],
    ['validation', row.validation],
    ['source_ref', row.sourceRef],
  ]) {
    if (!value) {
      errors.push(`${sourceView}: surface "${row.surfaceName}" is missing ${field}.`);
    }
  }
}

function validateDbSurfaceInventoryRows(rows, options = {}) {
  const normalizedRows = rows.map(normalizeRow);
  const errors = [];
  const source = options.source || sourceView;

  if (normalizedRows.length === 0) {
    errors.push(`${source}: no DB surface inventory rows found.`);
  }

  for (const row of normalizedRows) {
    if (!row.surfaceName) {
      errors.push(`${source}: row is missing surface_name.`);
      continue;
    }

    validateRequiredText(row, errors);

    if (!allowedDbSurfaceMigrationStates.has(row.migrationState)) {
      errors.push(
        `${source}: surface "${row.surfaceName}" has invalid migration state "${row.migrationState}".`
      );
    }

    if (!allowedDbSurfaceWriteRailKinds.has(row.writeRailKind)) {
      errors.push(
        `${source}: surface "${row.surfaceName}" has invalid write rail kind "${row.writeRailKind}".`
      );
    }

    if (!/^[a-f0-9]{64}$/.test(row.sourceContentSha256)) {
      errors.push(`${source}: surface "${row.surfaceName}" has invalid source content hash.`);
    }

    if (row.migrationState === 'DB-first') {
      if (row.writeRailKind !== 'db_command') {
        errors.push(
          `${source}: surface "${row.surfaceName}" is DB-first but write rail kind is "${row.writeRailKind}" instead of "db_command".`
        );
      }
      if (!row.dbFirstEligible || row.dbFirstBlocker) {
        errors.push(
          `${source}: surface "${row.surfaceName}" is DB-first but the read model marks it blocked.`
        );
      }
    }
  }

  const byName = new Map(normalizedRows.map((row) => [row.surfaceName, row]));
  for (const required of requiredSurfaces) {
    const row = byName.get(required.surfaceName);
    if (!row) {
      errors.push(`${source}: missing required surface "${required.surfaceName}".`);
      continue;
    }
    if (row.migrationState !== required.migrationState) {
      errors.push(
        `${source}: surface "${required.surfaceName}" must have migration state "${required.migrationState}", found "${row.migrationState}".`
      );
    }
    if (required.writeRailKind && row.writeRailKind !== required.writeRailKind) {
      errors.push(
        `${source}: surface "${required.surfaceName}" must have write rail kind "${required.writeRailKind}", found "${row.writeRailKind}".`
      );
    }
  }

  return { ok: errors.length === 0, errors, rows: normalizedRows };
}

async function runInventoryCheck(options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    const rows = await readDbSurfaceRows(client, { limit: options.limit || 500 });
    return validateDbSurfaceInventoryRows(rows);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function printHelp() {
  console.log('Usage: pnpm planning:db:inventory:check');
  console.log(`Validates ${sourceView} DB rows; it does not parse Markdown inventory tables.`);
}

async function runCli() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  const result = await runInventoryCheck();

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`[planning:db:surface-inventory] ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`[planning:db:surface-inventory] OK ${sourceView} rows=${result.rows.length}`);
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(`[planning:db:surface-inventory] ${error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  databaseUrl,
  requiredSurfaces,
  runInventoryCheck,
  validateDbSurfaceInventoryRows,
};
