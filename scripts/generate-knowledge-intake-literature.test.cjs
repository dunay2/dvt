const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const packageJson = require('../package.json');
const {
  buildKnowledgeIntakeLiteratureSelect,
  buildKnowledgeIntakeLiteratureSummary,
  renderKnowledgeIntakeLiterature,
  runKnowledgeIntakeLiteratureGenerator,
} = require('./generate-knowledge-intake-literature.cjs');

const fixtureRows = [
  {
    document_path: 'buzon/open.md',
    title: 'Open Analysis',
    retirement_state: 'open-actions',
    canonical_disposition: null,
    inbound_reference_count: 2,
    action_count: 4,
    open_action_count: 3,
    suggested_query:
      "pnpm planning:db:query knowledge-intake --state 'open-actions' --path 'buzon/open.md' --limit 30",
    source_content_sha256: 'b'.repeat(64),
  },
  {
    document_path: 'buzon/unknown.md',
    title: 'Unknown Analysis',
    retirement_state: 'unclassified',
    canonical_disposition: null,
    inbound_reference_count: 0,
    action_count: 0,
    open_action_count: 0,
    suggested_query:
      "pnpm planning:db:query knowledge-intake --state 'unclassified' --path 'buzon/unknown.md' --limit 30",
    source_content_sha256: 'a'.repeat(64),
  },
  {
    document_path: 'buzon/referenced.md',
    title: 'Referenced Analysis',
    retirement_state: 'referenced',
    canonical_disposition: null,
    inbound_reference_count: 5,
    action_count: 0,
    open_action_count: 0,
    suggested_query:
      "pnpm planning:db:query knowledge-intake --state 'referenced' --path 'buzon/referenced.md' --limit 30",
    source_content_sha256: 'c'.repeat(64),
  },
  {
    document_path: 'buzon/canonized.md',
    title: 'Canonized Analysis',
    retirement_state: 'canonized',
    canonical_disposition: 'docs/architecture/example.md',
    inbound_reference_count: 1,
    action_count: 0,
    open_action_count: 0,
    suggested_query:
      "pnpm planning:db:query knowledge-intake --state 'canonized' --path 'buzon/canonized.md' --limit 30",
    source_content_sha256: 'd'.repeat(64),
  },
];

test('knowledge-intake literature SQL reads the DB retirement projection only', () => {
  const sql = buildKnowledgeIntakeLiteratureSelect();

  assert.match(sql, /from planning_query_store\.knowledge_intake_retirement_query/);
  assert.doesNotMatch(sql, /from\s+buzon/i);
  assert.doesNotMatch(sql, /knowledge_documents/);
  assert.match(sql, /order by[\s\S]*retirement_state/);
});

test('knowledge-intake literature summary counts retirement states deterministically', () => {
  assert.deepEqual(buildKnowledgeIntakeLiteratureSummary(fixtureRows), {
    total: 4,
    states: {
      'open-actions': 1,
      unclassified: 1,
      referenced: 1,
      canonized: 1,
    },
    openActions: 3,
    inboundReferences: 8,
  });
});

test('knowledge-intake literature render is deterministic and timestamp-free', () => {
  const first = renderKnowledgeIntakeLiterature(fixtureRows);
  const second = renderKnowledgeIntakeLiterature([...fixtureRows].reverse());

  assert.equal(first, second);
  assert.match(first, /# Generated Knowledge Intake Literature/);
  assert.match(first, /Source view: `planning_query_store\.knowledge_intake_retirement_query`/);
  assert.match(first, /pnpm planning:db:query knowledge-intake --state open-actions --limit 30/);
  assert.match(first, /## Open Actions/);
  assert.match(first, /## Unclassified/);
  assert.match(first, /## Referenced/);
  assert.match(first, /## Canonized/);
  assert.doesNotMatch(first, /Generated (at|on)/i);
  assert.doesNotMatch(first, /\d{4}-\d{2}-\d{2}T\d{2}:/);
});

test('knowledge-intake literature escapes markdown table cells from DB content', () => {
  const rendered = renderKnowledgeIntakeLiterature([
    {
      ...fixtureRows[0],
      title: 'Open | Analysis \\ Draft | C:\\buzon\\raw.md',
    },
  ]);

  assert.ok(rendered.includes('Open \\| Analysis \\\\ Draft \\| C:\\\\buzon\\\\raw.md'));
});

test('knowledge-intake literature generator writes and checks the local render', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-intake-literature-'));
  const outputPath = path.join(tempRoot, 'generated-knowledge-intake-literature.md');
  const client = {
    async query(sql) {
      assert.match(sql, /knowledge_intake_retirement_query/);
      return { rows: fixtureRows };
    },
  };

  try {
    const generated = await runKnowledgeIntakeLiteratureGenerator({
      client,
      outputPath,
      logger: { log() {} },
    });
    assert.equal(generated.changed, true);
    assert.equal(fs.existsSync(outputPath), true);

    const checked = await runKnowledgeIntakeLiteratureGenerator({
      check: true,
      client,
      outputPath,
      logger: { log() {} },
    });
    assert.equal(checked.changed, false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('package scripts expose knowledge-intake literature generation without adding it to ci:docs', () => {
  assert.equal(
    packageJson.scripts['docs:knowledge-intake:generate'],
    'node scripts/generate-knowledge-intake-literature.cjs'
  );
  assert.equal(
    packageJson.scripts['docs:knowledge-intake:check'],
    'node scripts/generate-knowledge-intake-literature.cjs --check'
  );
  assert.doesNotMatch(
    packageJson.scripts['ci:docs'],
    /docs:knowledge-intake:check/,
    'DB-backed local literature must not make lightweight docs CI depend on Planning DB state'
  );
});
