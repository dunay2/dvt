/** Owned concern: import and query frontend component reflection as a DB-first read model. */
const fs = require('node:fs');
const path = require('node:path');
const { sha256HexUtf8 } = require('@dvt/crypto');

const { schemaName } = require('../planning-db-schema.cjs');
const {
  countField,
  headerIndexes,
  isSeparatorRow,
  markdownCells,
  normalizeCell,
  rawRow,
  rowValue,
} = require('./frontend-inventory-table.cjs');
const { appendFilter, appendTextSearchFilter } = require('./query-filter.cjs');
const { parseLimit } = require('./query-limit.cjs');

const repoRoot = path.resolve(__dirname, '..', '..');
const defaultInventoryPath = 'docs/architecture/components/web/frontend-component-inventory.md';

const validComponentKinds = new Set([
  'shell-frame',
  'shell-bar',
  'navigation',
  'health-banner',
  'console-drawer',
  'operational-drawer',
  'route-workbench',
  'route-toolbar',
  'state-view',
  'canvas-viewport',
  'canvas-explorer',
  'canvas-inspector',
  'modal',
  'form',
  'query-view',
  'table',
  'tab-strip',
  'primary-surface',
  'context-panel',
  'icon-wrapper',
]);
const validComponentStatuses = new Set([
  'current',
  'needed',
  'planned',
  'partial',
  'experimental',
  'retire',
]);
const validReuseDecisions = new Set([
  'reuse',
  'extract',
  'create',
  'harden',
  'standardize',
  'retire',
]);
const validFileRoles = new Set([
  'component',
  'view',
  'hook',
  'store',
  'port',
  'adapter',
  'query',
  'model',
  'view-model',
  'tokens',
  'test',
  'architecture-test',
  'e2e-test',
  'documentation',
]);
const validRailKinds = new Set([
  'command',
  'query',
  'projection',
  'local-command',
  'local-query',
  'command-probe',
]);
const validRailStatuses = new Set([
  'implemented-api',
  'implemented-local',
  'implemented-projection',
  'partial-ui',
  'fail-closed',
  'gap-needed',
  'not-front-default',
]);

const requiredHeadersBySection = {
  'Frontend Components': [
    'Component ID',
    'Component name',
    'Component kind',
    'Component status',
    'Reuse decision',
    'Frontend owner',
    'Responsibility',
    'Package',
    'Route scope',
    'Plugin scope',
    'Capability gaps',
    'Evidence',
  ],
  'Frontend Surface Component Links': [
    'Component ID',
    'Surface ID',
    'Route path',
    'Placement kind',
    'Placement order',
  ],
  'Frontend Component Files': ['Component ID', 'File path', 'File role', 'Exported symbol'],
  'Frontend Component Command Query Rails': [
    'Component ID',
    'Rail name',
    'Rail kind',
    'Rail status',
  ],
  'Frontend Component Evidence': [
    'Evidence ID',
    'Component ID',
    'Evidence kind',
    'Evidence ref',
    'Evidence status',
  ],
};

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function repoRelative(filePath) {
  return toPosix(path.relative(repoRoot, filePath));
}

function normalizeOptional(value) {
  const normalized = normalizeCell(value);
  return normalized && !/^(-|none|n\/a)$/i.test(normalized) ? normalized : '';
}

function normalizeList(value) {
  const normalized = normalizeOptional(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(';')
    .map((item) => normalizeOptional(item))
    .filter(Boolean);
}

function parseInteger(value) {
  const normalized = normalizeOptional(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid integer value "${normalized}".`);
  }
  return parsed;
}

function expectVocabulary(value, validValues, label, rowId) {
  if (!validValues.has(value)) {
    throw new Error(`Unknown ${label} "${value}" for ${rowId}.`);
  }
}

function sectionTableRows(documentContent, sectionName) {
  const headers = requiredHeadersBySection[sectionName];
  const lines = documentContent.split(/\r?\n/);
  const rows = [];
  let inSection = false;
  let indexes = null;

  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      if (inSection && indexes) {
        break;
      }
      inSection = heading[1] === sectionName;
      indexes = null;
      continue;
    }

    if (!inSection) {
      continue;
    }

    if (!line.trim().startsWith('|')) {
      if (indexes && rows.length > 0) {
        break;
      }
      continue;
    }

    const cells = markdownCells(line);
    if (!indexes) {
      indexes = headerIndexes(cells, headers);
      continue;
    }
    if (isSeparatorRow(cells)) {
      continue;
    }

    rows.push({ cells, indexes, headers });
  }

  if (!indexes) {
    throw new Error(`Missing import table for section "${sectionName}".`);
  }

  return rows;
}

function parseInventoryDocument(document) {
  const sourceContentSha256 = sha256HexUtf8(document.content);
  const components = sectionTableRows(document.content, 'Frontend Components').map(
    ({ cells, indexes, headers }) => {
      const componentId = rowValue(cells, indexes, 'Component ID');
      const componentKind = rowValue(cells, indexes, 'Component kind');
      const componentStatus = rowValue(cells, indexes, 'Component status');
      const reuseDecision = rowValue(cells, indexes, 'Reuse decision');
      expectVocabulary(componentKind, validComponentKinds, 'component kind', componentId);
      expectVocabulary(componentStatus, validComponentStatuses, 'component status', componentId);
      expectVocabulary(reuseDecision, validReuseDecisions, 'reuse decision', componentId);
      return {
        componentId,
        componentName: rowValue(cells, indexes, 'Component name'),
        componentKind,
        componentStatus,
        reuseDecision,
        frontendOwner: rowValue(cells, indexes, 'Frontend owner'),
        responsibility: rowValue(cells, indexes, 'Responsibility'),
        packageName: rowValue(cells, indexes, 'Package') || '@dvt/web',
        routeScope: normalizeOptional(cells[indexes['Route scope']]),
        pluginScope: normalizeOptional(cells[indexes['Plugin scope']]),
        capabilityGaps: normalizeList(cells[indexes['Capability gaps']]),
        evidenceRefs: normalizeList(cells[indexes.Evidence]),
        sourcePath: document.path,
        sourceContentSha256,
        rawComponent: rawRow(cells, indexes, headers),
      };
    }
  );

  const surfaceLinks = sectionTableRows(document.content, 'Frontend Surface Component Links').map(
    ({ cells, indexes, headers }) => ({
      componentId: rowValue(cells, indexes, 'Component ID'),
      surfaceId: rowValue(cells, indexes, 'Surface ID'),
      routePath: normalizeOptional(cells[indexes['Route path']]),
      placementKind: rowValue(cells, indexes, 'Placement kind'),
      placementOrder: parseInteger(cells[indexes['Placement order']]),
      rawLink: rawRow(cells, indexes, headers),
    })
  );

  const files = sectionTableRows(document.content, 'Frontend Component Files').map(
    ({ cells, indexes, headers }) => {
      const componentId = rowValue(cells, indexes, 'Component ID');
      const fileRole = rowValue(cells, indexes, 'File role');
      expectVocabulary(fileRole, validFileRoles, 'file role', componentId);
      return {
        componentId,
        filePath: rowValue(cells, indexes, 'File path'),
        fileRole,
        exportedSymbol: normalizeOptional(cells[indexes['Exported symbol']]),
        rawFile: rawRow(cells, indexes, headers),
      };
    }
  );

  const rails = sectionTableRows(document.content, 'Frontend Component Command Query Rails').map(
    ({ cells, indexes, headers }) => {
      const componentId = rowValue(cells, indexes, 'Component ID');
      const railKind = rowValue(cells, indexes, 'Rail kind');
      const railStatus = rowValue(cells, indexes, 'Rail status');
      expectVocabulary(railKind, validRailKinds, 'rail kind', componentId);
      expectVocabulary(railStatus, validRailStatuses, 'rail status', componentId);
      return {
        componentId,
        railName: rowValue(cells, indexes, 'Rail name'),
        railKind,
        railStatus,
        rawRail: rawRow(cells, indexes, headers),
      };
    }
  );

  const evidence = sectionTableRows(document.content, 'Frontend Component Evidence').map(
    ({ cells, indexes, headers }) => ({
      evidenceId: rowValue(cells, indexes, 'Evidence ID'),
      componentId: rowValue(cells, indexes, 'Component ID'),
      evidenceKind: rowValue(cells, indexes, 'Evidence kind'),
      evidenceRef: rowValue(cells, indexes, 'Evidence ref'),
      evidenceStatus: rowValue(cells, indexes, 'Evidence status'),
      rawEvidence: rawRow(cells, indexes, headers),
    })
  );

  return { components, surfaceLinks, files, rails, evidence };
}

function readDefaultInventoryDocument() {
  const absolutePath = path.join(repoRoot, defaultInventoryPath);
  return {
    path: repoRelative(absolutePath),
    content: fs.readFileSync(absolutePath, 'utf8'),
  };
}

function buildFrontendComponentReflectionSnapshot(options = {}) {
  const docs = options.docs || [readDefaultInventoryDocument()];
  return docs.reduce(
    (snapshot, document) => {
      const parsed = parseInventoryDocument(document);
      snapshot.components.push(...parsed.components);
      snapshot.surfaceLinks.push(...parsed.surfaceLinks);
      snapshot.files.push(...parsed.files);
      snapshot.rails.push(...parsed.rails);
      snapshot.evidence.push(...parsed.evidence);
      return snapshot;
    },
    { components: [], surfaceLinks: [], files: [], rails: [], evidence: [] }
  );
}

function buildFrontendComponentRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    row.component_name ?? row.componentName,
    row.component_kind ?? row.componentKind,
    row.component_status ?? row.componentStatus,
    row.reuse_decision ?? row.reuseDecision,
    countField(row, 'surface_count', 'surfaceIds'),
    countField(row, 'file_count', 'files'),
    countField(row, 'rail_count', 'rails'),
    countField(row, 'evidence_ref_count', 'evidence'),
    row.source_path ?? row.sourcePath,
  ]);
}

function buildFrontendComponentFileRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    row.file_path ?? row.filePath,
    row.file_role ?? row.fileRole,
    row.exported_symbol ?? row.exportedSymbol ?? '-',
  ]);
}

function buildFrontendComponentRailRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    row.rail_name ?? row.railName,
    row.rail_kind ?? row.railKind,
    row.rail_status ?? row.railStatus,
  ]);
}

async function readFrontendComponentRows(client, filters = {}, options = {}) {
  const activeSchemaName = options.schemaName || schemaName;
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component || filters.componentId);
  appendFilter(predicates, params, 'component_kind', filters.kind || filters.componentKind);
  appendFilter(
    predicates,
    params,
    'component_status',
    filters.state || filters.status || filters.componentStatus
  );
  appendFilter(predicates, params, 'frontend_owner', filters.owner || filters.frontendOwner);
  appendTextSearchFilter(
    predicates,
    params,
    ['component_id', 'component_name', 'responsibility', 'frontend_owner', 'source_path'],
    filters.search
  );
  if (filters.surface || filters.surfaceId) {
    params.push(filters.surface || filters.surfaceId);
    predicates.push(`component_id in (
      select component_id
      from ${activeSchemaName}.frontend_component_surface_link_query
      where surface_id = $${params.length}
    )`);
  }

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `select
       component_id,
       component_name,
       component_kind,
       component_status,
       reuse_decision,
       frontend_owner,
       responsibility,
       package_name,
       surface_count,
       file_count,
       rail_count,
       evidence_ref_count,
       source_path,
       source_content_sha256
     from ${activeSchemaName}.frontend_component_summary_query
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_kind, component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readFrontendComponentFileRows(client, filters = {}, options = {}) {
  const activeSchemaName = options.schemaName || schemaName;
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component || filters.componentId);
  appendFilter(predicates, params, 'file_role', filters.role || filters.kind);
  appendFilter(predicates, params, 'file_path', filters.path);
  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `select component_id, file_path, file_role, exported_symbol
     from ${activeSchemaName}.frontend_component_file_query
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id, file_path, file_role
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readFrontendComponentRailRows(client, filters = {}, options = {}) {
  const activeSchemaName = options.schemaName || schemaName;
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component || filters.componentId);
  appendFilter(predicates, params, 'rail_name', filters.rail || filters.railName);
  appendFilter(predicates, params, 'rail_kind', filters.kind || filters.type);
  appendFilter(predicates, params, 'rail_status', filters.status || filters.railStatus);
  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `select component_id, rail_name, rail_kind, rail_status
     from ${activeSchemaName}.frontend_component_rail_query
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id, rail_name
     limit $${params.length}`,
    params
  );

  return result.rows;
}

module.exports = {
  buildFrontendComponentFileRows,
  buildFrontendComponentRailRows,
  buildFrontendComponentReflectionSnapshot,
  buildFrontendComponentRows,
  normalizeList,
  readFrontendComponentFileRows,
  readFrontendComponentRailRows,
  readFrontendComponentRows,
};
