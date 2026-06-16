/**
 * Owned concern: import and query frontend route capability truth as a DB-first read model.
 * Command/query rails: `ListFrontendMechanicalTruthSurfaces`.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { schemaName } = require('../planning-db-migrate.cjs');

const repoRoot = path.resolve(__dirname, '..', '..');
const defaultInventoryPath =
  'docs/architecture/components/web/frontend-mechanical-truth-inventory.md';
const validScreenStates = new Set([
  'operational-product',
  'preview',
  'disabled-unsupported',
  'experimental',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function repoRelative(filePath) {
  return toPosix(path.relative(repoRoot, filePath));
}

function stripInlineCode(value) {
  return String(value ?? '').replace(/`([^`]*)`/g, '$1');
}

function normalizeCell(value) {
  return stripInlineCode(value).replace(/\s+/g, ' ').trim();
}

function normalizeFrontendMechanicalTruthList(value) {
  const normalized = normalizeCell(value);
  if (!normalized || /^(-|none|n\/a)$/i.test(normalized)) {
    return [];
  }

  return normalized
    .split(';')
    .map((item) => normalizeCell(item))
    .filter((item) => item.length > 0 && !/^(-|none|n\/a)$/i.test(item));
}

function markdownCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function normalizeHeader(value) {
  return normalizeCell(value).toLowerCase();
}

const requiredHeaders = [
  'Surface ID',
  'Surface kind',
  'Route path',
  'Screen state',
  'Frontend owner',
  'Registered plugins',
  'Consumed endpoints',
  'Zustand stores',
  'TanStack queries',
  'Visible no-backend affordances',
  'Capability gaps',
  'Evidence',
];

function headerIndexes(cells) {
  const byHeader = new Map(cells.map((cell, index) => [normalizeHeader(cell), index]));
  const missing = requiredHeaders.filter((header) => !byHeader.has(normalizeHeader(header)));

  if (missing.length > 0) {
    return null;
  }

  return Object.fromEntries(
    requiredHeaders.map((header) => [header, byHeader.get(normalizeHeader(header))])
  );
}

function rowValue(cells, indexes, header) {
  return normalizeCell(cells[indexes[header]]);
}

function parseInventoryTable(document) {
  const lines = document.content.split(/\r?\n/);
  const sourceContentSha256 = sha256(document.content);
  const surfaces = [];
  let indexes = null;

  for (const line of lines) {
    if (!line.trim().startsWith('|')) {
      if (indexes && surfaces.length > 0) {
        break;
      }
      continue;
    }

    const cells = markdownCells(line);
    if (!indexes) {
      indexes = headerIndexes(cells);
      continue;
    }

    if (isSeparatorRow(cells)) {
      continue;
    }

    const surfaceId = rowValue(cells, indexes, 'Surface ID');
    if (!surfaceId) {
      continue;
    }

    const screenState = rowValue(cells, indexes, 'Screen state');
    if (!validScreenStates.has(screenState)) {
      throw new Error(`Unknown frontend screen state "${screenState}" for ${surfaceId}.`);
    }

    const rawSurface = Object.fromEntries(
      requiredHeaders.map((header) => [header, normalizeCell(cells[indexes[header]])])
    );

    surfaces.push({
      surfaceId,
      surfaceKind: rowValue(cells, indexes, 'Surface kind'),
      routePath: rowValue(cells, indexes, 'Route path'),
      screenState,
      frontendOwner: rowValue(cells, indexes, 'Frontend owner'),
      registeredPlugins: normalizeFrontendMechanicalTruthList(cells[indexes['Registered plugins']]),
      consumedEndpoints: normalizeFrontendMechanicalTruthList(cells[indexes['Consumed endpoints']]),
      zustandStores: normalizeFrontendMechanicalTruthList(cells[indexes['Zustand stores']]),
      tanstackQueries: normalizeFrontendMechanicalTruthList(cells[indexes['TanStack queries']]),
      visibleNoBackendAffordances: normalizeFrontendMechanicalTruthList(
        cells[indexes['Visible no-backend affordances']]
      ),
      capabilityGaps: normalizeFrontendMechanicalTruthList(cells[indexes['Capability gaps']]),
      evidenceRefs: normalizeFrontendMechanicalTruthList(cells[indexes.Evidence]),
      sourcePath: document.path,
      sourceContentSha256,
      rawSurface,
    });
  }

  return surfaces;
}

function readDefaultInventoryDocument() {
  const absolutePath = path.join(repoRoot, defaultInventoryPath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  return {
    path: repoRelative(absolutePath),
    content,
  };
}

function buildFrontendMechanicalTruthSnapshot(options = {}) {
  const docs = options.docs || [readDefaultInventoryDocument()];
  return {
    surfaces: docs.flatMap(parseInventoryTable),
  };
}

function countField(row, snakeName, camelName) {
  const explicit = row[snakeName];
  if (explicit !== undefined && explicit !== null) {
    return Number(explicit);
  }

  const arrayValue = row[camelName];
  return Array.isArray(arrayValue) ? arrayValue.length : 0;
}

function buildFrontendMechanicalTruthRows(rows) {
  return rows.map((row) => [
    row.surface_kind ?? row.surfaceKind,
    row.route_path ?? row.routePath,
    row.surface_id ?? row.surfaceId,
    row.screen_state ?? row.screenState,
    row.frontend_owner ?? row.frontendOwner,
    countField(row, 'registered_plugin_count', 'registeredPlugins'),
    countField(row, 'consumed_endpoint_count', 'consumedEndpoints'),
    countField(row, 'zustand_store_count', 'zustandStores'),
    countField(row, 'tanstack_query_count', 'tanstackQueries'),
    countField(row, 'capability_gap_count', 'capabilityGaps'),
    row.source_path ?? row.sourcePath,
  ]);
}

function parseLimit(value, defaultLimit) {
  if (value === undefined || value === null || value === '') {
    return defaultLimit;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --limit "${value}". Expected a positive integer.`);
  }

  return parsed;
}

function appendFilter(predicates, params, column, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  params.push(value);
  predicates.push(`${column} = $${params.length}`);
}

async function readFrontendMechanicalTruthRows(client, filters = {}, options = {}) {
  const activeSchemaName = options.schemaName || schemaName;
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'surface_kind', filters.kind);
  appendFilter(predicates, params, 'screen_state', filters.state || filters.screenState);
  appendFilter(predicates, params, 'route_path', filters.path || filters.routePath);
  appendFilter(predicates, params, 'frontend_owner', filters.owner || filters.frontendOwner);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `select
       surface_id,
       surface_kind,
       route_path,
       screen_state,
       frontend_owner,
       registered_plugin_count,
       consumed_endpoint_count,
       zustand_store_count,
       tanstack_query_count,
       no_backend_affordance_count,
       capability_gap_count,
       source_path,
       source_content_sha256,
       imported_at
     from ${activeSchemaName}.frontend_mechanical_truth_query
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
       case screen_state
         when 'operational-product' then 0
         when 'preview' then 1
         when 'disabled-unsupported' then 2
         else 3
       end,
       route_path,
       surface_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

module.exports = {
  buildFrontendMechanicalTruthRows,
  buildFrontendMechanicalTruthSnapshot,
  normalizeFrontendMechanicalTruthList,
  readFrontendMechanicalTruthRows,
};
