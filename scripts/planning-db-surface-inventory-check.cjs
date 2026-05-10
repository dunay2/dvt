const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const defaultInventoryPath = path.join(
  repoRoot,
  'docs',
  'planning',
  'status',
  'db-surface-inventory.md'
);

const requiredColumns = [
  'Surface',
  'Canonical source',
  'Write rail',
  'Read/query rail',
  'Projection',
  'Validation',
  'Migration state',
];

const allowedMigrationStates = new Set([
  'Bootstrap/export',
  'DB-first',
  'Generated-only',
  'Git-first indexed',
  'Hybrid indexed',
]);

const requiredSurfaces = [
  {
    surface: 'Planning task lifecycle',
    includes: {
      'Canonical source': ['planning_query_store', 'DB local definitions', 'bootstrap/export'],
      'Write rail': ['planning:db:operate'],
      'Read/query rail': ['planning:db:query', 'tasks', 'next'],
      Projection: ['execution-workboard.md', 'open-task-route.md'],
      Validation: ['planning:db:check', 'planning:db:export:check', 'docs:workboard:check'],
      'Migration state': ['DB-first'],
    },
  },
  {
    surface: 'Planning lane registry',
    includes: {
      'Canonical source': ['planning_query_store lane rows', 'agent-lane-*.yaml', 'snapshot'],
      'Write rail': ['planning:db:import', '--if-stale', '--planning-only'],
      'Read/query rail': ['planning:db:query'],
      Projection: ['DB lane rows'],
      Validation: ['planning:db:check', 'planning:db:export:check'],
      'Migration state': ['Bootstrap/export'],
    },
  },
  {
    surface: 'Workboard and open task route',
    includes: {
      'Canonical source': ['DB effective planning views'],
      'Write rail': ['No direct file write'],
      'Read/query rail': ['planning:db:query next', 'source `db`'],
      Projection: ['execution-workboard.md', 'open-task-route.md'],
      Validation: ['docs:workboard:check', 'planning:db:export:check'],
      'Migration state': ['Generated-only'],
    },
  },
  {
    surface: 'Governance file inventory',
    includes: {
      'Canonical source': ['Git tracked docs', 'governance DB'],
      'Write rail': ['governance:refresh', 'governance:db:import'],
      'Read/query rail': ['governance:db:query files', 'governance:db:query components'],
      Projection: ['docs/.manifest.json', 'system-governance-unit-index'],
      Validation: ['governance:db:check', 'governance:db:export:check'],
      'Migration state': ['Hybrid indexed'],
    },
  },
  {
    surface: 'Governance remediation queue',
    includes: {
      'Canonical source': ['Governance DB', 'coverage', 'fingerprint'],
      'Write rail': ['governance:refresh'],
      'Read/query rail': ['governance:db:query remediation', 'governance:db:query coverage'],
      Projection: ['coverage', 'remediation'],
      Validation: [
        'docs:governance:coverage-report:check',
        'docs:governance:remediation-queue:check',
      ],
      'Migration state': ['Generated-only'],
    },
  },
  {
    surface: 'ADR and contract decisions',
    includes: {
      'Canonical source': ['docs/adr/**', 'specs/contracts/**'],
      'Write rail': ['ADR', 'contract review'],
      'Read/query rail': ['governance:db:query files'],
      Projection: ['Docs indexes', 'governance file inventory'],
      Validation: ['docs:sync:check', 'contracts:index:check', 'docs:arc:evidence:check'],
      'Migration state': ['Git-first indexed'],
    },
  },
  {
    surface: 'Risk and evidence records',
    includes: {
      'Canonical source': ['docs/evidence/**', 'docs/risk-register/**'],
      'Write rail': ['ARC evidence', 'risk register'],
      'Read/query rail': ['governance:db:query files'],
      Projection: ['docs/evidence/index.md', 'docs/risk-register/index.md'],
      Validation: ['docs:sync:check', 'docs:arc:evidence:check'],
      'Migration state': ['Git-first indexed'],
    },
  },
  {
    surface: 'Repository command catalog',
    includes: {
      'Canonical source': ['repository-command-catalog.mjs'],
      'Write rail': ['Git edit'],
      'Read/query rail': ['planning:db:query commands', 'planning:db:query pr-readiness'],
      Projection: ['command', 'PR-readiness'],
      Validation: ['test:ci-tools', 'docs:feature-mechanization:implementation'],
      'Migration state': ['Hybrid indexed'],
    },
  },
  {
    surface: 'Docs task disposition inventory',
    includes: {
      'Canonical source': ['docs-task-disposition-inventory-20260510.md'],
      'Write rail': ['governance:refresh'],
      'Read/query rail': [
        'planning:db:query docs-disposition',
        'planning:db:query task-references',
      ],
      Projection: ['Disposition query rows', 'task-reference reports'],
      Validation: ['governance:db:check', 'docs:governance:changed-files:check'],
      'Migration state': ['Git-first indexed'],
    },
  },
  {
    surface: 'Docs resolution overlays',
    includes: {
      'Canonical source': ['doc_resolution_overlays', 'source hashes'],
      'Write rail': [
        'planning:db:operate docs-disposition resolve',
        'planning:db:operate task-gap resolve',
      ],
      'Read/query rail': [
        'planning:db:query docs-disposition --resolution',
        'planning:db:query task-gaps --resolution',
      ],
      Projection: ['doc_disposition_action_query', 'planning_task_gap_query'],
      Validation: ['test:planning:db', 'planning:db:query task-gaps --resolution all'],
      'Migration state': ['DB-first'],
    },
  },
];

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorLine(line) {
  const cells = splitMarkdownRow(line);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function parseMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];

    if (!headerLine.trim().startsWith('|') || !isSeparatorLine(separatorLine)) {
      continue;
    }

    const headers = splitMarkdownRow(headerLine);
    const rows = [];
    index += 2;

    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const cells = splitMarkdownRow(lines[index]);
      const row = {};

      headers.forEach((header, cellIndex) => {
        row[header] = cells[cellIndex] || '';
      });
      rows.push(row);
      index += 1;
    }

    tables.push({ headers, rows });
    index -= 1;
  }

  return tables;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function includesTerm(value, term) {
  return normalizeText(value).includes(normalizeText(term));
}

function findSurfaceTable(markdown) {
  return parseMarkdownTables(markdown).find((table) =>
    requiredColumns.every((column) => table.headers.includes(column))
  );
}

function validateInventory(markdown, options = {}) {
  const inventoryPath = options.inventoryPath || defaultInventoryPath;
  const errors = [];

  if (!markdown.includes('# DB Surface Inventory')) {
    errors.push(`${inventoryPath}: missing "# DB Surface Inventory" heading.`);
  }

  if (!markdown.includes('InventoryDbGovernanceSurface')) {
    errors.push(`${inventoryPath}: missing InventoryDbGovernanceSurface rail.`);
  }

  const table = findSurfaceTable(markdown);

  if (!table) {
    errors.push(
      `${inventoryPath}: missing surface inventory table with columns ${requiredColumns.join(', ')}.`
    );

    return { ok: false, errors };
  }

  const missingColumns = requiredColumns.filter((column) => !table.headers.includes(column));

  for (const column of missingColumns) {
    errors.push(`${inventoryPath}: missing required column "${column}".`);
  }

  for (const row of table.rows) {
    const state = row['Migration state'];

    if (!allowedMigrationStates.has(state)) {
      errors.push(
        `${inventoryPath}: surface "${row.Surface}" has invalid migration state "${state}".`
      );
    }
  }

  for (const required of requiredSurfaces) {
    const row = table.rows.find((candidate) => candidate.Surface === required.surface);

    if (!row) {
      errors.push(`${inventoryPath}: missing required surface "${required.surface}".`);
      continue;
    }

    for (const [column, terms] of Object.entries(required.includes)) {
      for (const term of terms) {
        if (!includesTerm(row[column], term)) {
          errors.push(
            `${inventoryPath}: surface "${required.surface}" column "${column}" must mention "${term}".`
          );
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, rows: table.rows };
}

function runCli() {
  const inventoryPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : defaultInventoryPath;

  if (!fs.existsSync(inventoryPath)) {
    console.error(`[planning:db:surface-inventory] Missing ${inventoryPath}`);
    process.exitCode = 1;
    return;
  }

  const result = validateInventory(fs.readFileSync(inventoryPath, 'utf8'), { inventoryPath });

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`[planning:db:surface-inventory] ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`[planning:db:surface-inventory] OK ${path.relative(repoRoot, inventoryPath)}`);
}

if (require.main === module) {
  runCli();
}

module.exports = {
  allowedMigrationStates,
  findSurfaceTable,
  parseMarkdownTables,
  requiredColumns,
  requiredSurfaces,
  validateInventory,
};
