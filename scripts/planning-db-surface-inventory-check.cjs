#!/usr/bin/env node
/** Owned concern: validate DB-governed surface inventory rows, not manual Markdown tables. */
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { textValue } = require('./planning-db/query-format.cjs');
const {
  allowedDbSurfaceAuthorityModes,
  allowedDbSurfaceWriteRailKinds,
  readDbSurfaceRows,
  sourceView,
} = require('./planning-db/db-surface-inventory.cjs');

const requiredSurfaces = [
  { surfaceName: 'Governance file inventory', authorityMode: 'hybrid-indexed' },
  {
    surfaceName: 'Architecture design authority',
    authorityMode: 'database',
    writeRailKind: 'db_command',
  },
  {
    surfaceName: 'Governance component definition',
    authorityMode: 'database',
    writeRailKind: 'db_command',
  },
  { surfaceName: 'Governance remediation queue', authorityMode: 'generated' },
  { surfaceName: 'ADR and contract decisions', authorityMode: 'git-indexed' },
  { surfaceName: 'Risk and evidence records', authorityMode: 'git-indexed' },
  { surfaceName: 'Repository command catalog', authorityMode: 'hybrid-indexed' },
  { surfaceName: 'Command/query rail catalog', authorityMode: 'hybrid-indexed' },
  { surfaceName: 'Knowledge intake literature', authorityMode: 'hybrid-indexed' },
  { surfaceName: 'Documentation lifecycle catalog', authorityMode: 'hybrid-indexed' },
  { surfaceName: 'AI project context', authorityMode: 'hybrid-indexed' },
  { surfaceName: 'Docs task disposition inventory', authorityMode: 'git-indexed' },
  {
    surfaceName: 'Docs resolution overlays',
    authorityMode: 'database',
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
    authorityMode: textValue(row.authority_mode ?? row.authorityMode, ''),
    sourceRef: textValue(row.source_ref ?? row.sourceRef, ''),
    sourceContentSha256: textValue(row.source_content_sha256 ?? row.sourceContentSha256, ''),
    databaseWriteEligible: booleanValue(row.database_write_eligible ?? row.databaseWriteEligible),
    databaseWriteBlocker: textValue(row.database_write_blocker ?? row.databaseWriteBlocker, ''),
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

    if (!allowedDbSurfaceAuthorityModes.has(row.authorityMode)) {
      errors.push(
        `${source}: surface "${row.surfaceName}" has invalid authority mode "${row.authorityMode}".`
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

    if (row.authorityMode === 'database') {
      if (row.writeRailKind !== 'db_command') {
        errors.push(
          `${source}: surface "${row.surfaceName}" is database but write rail kind is "${row.writeRailKind}" instead of "db_command".`
        );
      }
      if (!row.databaseWriteEligible || row.databaseWriteBlocker) {
        errors.push(
          `${source}: surface "${row.surfaceName}" is database but the read model marks it blocked.`
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
    if (row.authorityMode !== required.authorityMode) {
      errors.push(
        `${source}: surface "${required.surfaceName}" must have authority mode "${required.authorityMode}", found "${row.authorityMode}".`
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
