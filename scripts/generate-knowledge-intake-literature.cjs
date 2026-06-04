#!/usr/bin/env node
/** Owned concern: render DB-backed knowledge intake retirement literature into local generated docs. */
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const defaultOutputPath = path.join(
  repoRoot,
  '.generated-docs',
  'planning',
  'status',
  'generated-knowledge-intake-literature.md'
);
const sourceView = 'planning_query_store.knowledge_intake_retirement_query';
const stateOrder = ['open-actions', 'unclassified', 'referenced', 'canonized'];
const stateTitles = {
  'open-actions': 'Open Actions',
  unclassified: 'Unclassified',
  referenced: 'Referenced',
  canonized: 'Canonized',
};

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function relFromRepo(filePath) {
  return toPosix(path.relative(repoRoot, filePath));
}

function numericCount(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

function markdownCell(value) {
  return textValue(value).replace(/\|/g, '\\|');
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(markdownCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
}

function stateRank(state) {
  const index = stateOrder.indexOf(state);
  return index === -1 ? stateOrder.length : index;
}

function buildKnowledgeIntakeLiteratureSelect() {
  return `
    select
      document_path,
      title,
      retirement_state,
      canonical_disposition,
      inbound_reference_count,
      action_count,
      open_action_count,
      suggested_query,
      source_content_sha256
    from ${sourceView}
    order by
      case retirement_state
        when 'open-actions' then 1
        when 'unclassified' then 2
        when 'referenced' then 3
        when 'canonized' then 4
        else 5
      end,
      open_action_count desc,
      inbound_reference_count desc,
      document_path`;
}

function normalizeKnowledgeIntakeRow(row) {
  return {
    documentPath: textValue(row.document_path ?? row.documentPath),
    title: textValue(row.title),
    retirementState: textValue(row.retirement_state ?? row.retirementState, 'unclassified'),
    canonicalDisposition: textValue(row.canonical_disposition ?? row.canonicalDisposition, '-'),
    inboundReferenceCount: numericCount(row.inbound_reference_count ?? row.inboundReferenceCount),
    actionCount: numericCount(row.action_count ?? row.actionCount),
    openActionCount: numericCount(row.open_action_count ?? row.openActionCount),
    suggestedQuery: textValue(row.suggested_query ?? row.suggestedQuery),
    sourceContentSha256: textValue(row.source_content_sha256 ?? row.sourceContentSha256),
  };
}

function sortKnowledgeIntakeRows(rows) {
  return [...rows].map(normalizeKnowledgeIntakeRow).sort((left, right) => {
    return (
      stateRank(left.retirementState) - stateRank(right.retirementState) ||
      right.openActionCount - left.openActionCount ||
      right.inboundReferenceCount - left.inboundReferenceCount ||
      left.documentPath.localeCompare(right.documentPath)
    );
  });
}

function buildKnowledgeIntakeLiteratureSummary(rows) {
  const normalizedRows = rows.map(normalizeKnowledgeIntakeRow);
  const states = Object.fromEntries(stateOrder.map((state) => [state, 0]));
  let openActions = 0;
  let inboundReferences = 0;

  for (const row of normalizedRows) {
    states[row.retirementState] = (states[row.retirementState] || 0) + 1;
    openActions += row.openActionCount;
    inboundReferences += row.inboundReferenceCount;
  }

  return {
    total: normalizedRows.length,
    states,
    openActions,
    inboundReferences,
  };
}

function stateQuery(state) {
  return `pnpm planning:db:query knowledge-intake --state ${state} --limit 30`;
}

function renderStateSection(state, rows) {
  const title = stateTitles[state] || state;
  const stateRows = rows.filter((row) => row.retirementState === state);
  const lines = [`## ${title}`, ''];

  if (stateRows.length === 0) {
    lines.push('No rows currently project into this state.');
    return lines.join('\n');
  }

  lines.push(
    markdownTable(
      ['Document', 'Title', 'Open actions', 'Inbound refs', 'Disposition', 'Content hash'],
      stateRows.map((row) => [
        `\`${row.documentPath}\``,
        row.title,
        String(row.openActionCount),
        String(row.inboundReferenceCount),
        row.canonicalDisposition,
        row.sourceContentSha256.slice(0, 12),
      ])
    )
  );
  return lines.join('\n');
}

function renderKnowledgeIntakeLiterature(rows) {
  const sortedRows = sortKnowledgeIntakeRows(rows);
  const summary = buildKnowledgeIntakeLiteratureSummary(sortedRows);
  const summaryRows = [
    ['Total intake documents', String(summary.total)],
    ['Open action rows', String(summary.openActions)],
    ['Inbound governed references', String(summary.inboundReferences)],
    ...stateOrder.map((state) => [stateTitles[state], String(summary.states[state] || 0)]),
  ];

  return [
    '---',
    'title: Generated Knowledge Intake Literature',
    'status: Active',
    'owner: Architecture / Planning DB',
    'planning_type: status',
    '---',
    '',
    '# Generated Knowledge Intake Literature',
    '',
    '> This page is auto-generated by `pnpm docs:knowledge-intake:generate`. Do not edit manually.',
    '',
    `Source view: \`${sourceView}\`.`,
    '',
    'The tracked status page is only a stable navigation pointer. This local render is the DB-first reading surface for retiring raw knowledge intake files.',
    '',
    '## Summary',
    '',
    markdownTable(['Metric', 'Value'], summaryRows),
    '',
    '## Query Shortcuts',
    '',
    ...stateOrder.map((state) => `- \`${stateQuery(state)}\``),
    '',
    ...stateOrder.flatMap((state) => [renderStateSection(state, sortedRows), '']),
  ].join('\n');
}

async function readKnowledgeIntakeLiteratureRows(client) {
  const result = await client.query(buildKnowledgeIntakeLiteratureSelect());
  return result.rows;
}

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === content) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

async function runKnowledgeIntakeLiteratureGenerator(options = {}) {
  const outputPath = path.resolve(options.outputPath || defaultOutputPath);
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;
  const logger = options.logger || console;

  if (ownsClient) {
    await client.connect();
  }

  try {
    const rows = await readKnowledgeIntakeLiteratureRows(client);
    const content = renderKnowledgeIntakeLiterature(rows);
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;
    const changed = current !== content;

    if (options.check) {
      if (changed) {
        throw new Error(
          `${relFromRepo(outputPath)} is stale. Run pnpm docs:knowledge-intake:generate.`
        );
      }
      logger.log(`[docs:knowledge-intake:check] ${relFromRepo(outputPath)} already up to date.`);
      return { changed: false, outputPath, rowCount: rows.length };
    }

    const wrote = writeIfChanged(outputPath, content);
    logger.log(
      wrote
        ? `[docs:knowledge-intake:generate] Updated ${relFromRepo(outputPath)}`
        : `[docs:knowledge-intake:generate] ${relFromRepo(outputPath)} already up to date.`
    );
    return { changed: wrote, outputPath, rowCount: rows.length };
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') {
      options.check = true;
      continue;
    }
    if (arg === '--output') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--output requires a path.');
      }
      options.outputPath = value;
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown docs:knowledge-intake option "${arg}".`);
  }

  return options;
}

function printHelp() {
  console.log('Usage: pnpm docs:knowledge-intake:generate [--check] [--output <path>]');
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }
  await runKnowledgeIntakeLiteratureGenerator(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[docs:knowledge-intake] ${error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  buildKnowledgeIntakeLiteratureSelect,
  buildKnowledgeIntakeLiteratureSummary,
  defaultOutputPath,
  normalizeKnowledgeIntakeRow,
  parseArgs,
  readKnowledgeIntakeLiteratureRows,
  renderKnowledgeIntakeLiterature,
  runKnowledgeIntakeLiteratureGenerator,
  sortKnowledgeIntakeRows,
};
