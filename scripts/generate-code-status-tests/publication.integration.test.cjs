const { repoRoot } = require('./helpers.cjs');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { Client } = require('pg');
const { importContent } = require('../planning-db-import.cjs');
const { defaultPgUrl } = require('../planning-db-run.cjs');
const {
  buildComponentTopologyProjection,
  collectRepositoryWorkspaceStats,
  main,
  parsePnpmWorkspaceRows,
  readComponentTopologyFacts,
  readRepositoryArchitectureFacts,
  renderRepositoryMap,
} = require('../generate-code-status.cjs');
function dbUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

test(
  'live Planning DB current-state import renders both DB-first maps deterministically',
  { skip: process.env.DVT_REPOSITORY_MAP_INTEGRATION !== '1' },
  async () => {
    await importContent({ databaseUrl: dbUrl(), silent: true });
    const client = new Client({ connectionString: dbUrl() });
    await client.connect();
    try {
      const facts = await readRepositoryArchitectureFacts(client);
      const topologyFacts = await readComponentTopologyFacts(client);
      const topology = buildComponentTopologyProjection(topologyFacts);
      const workspaces = collectRepositoryWorkspaceStats();
      const independentPnpmResult = spawnSync(
        process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
        ['list', '-r', '--depth', '-1', '--json'],
        { cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32' }
      );
      assert.equal(
        independentPnpmResult.status,
        0,
        `${independentPnpmResult.stdout}\n${independentPnpmResult.stderr}`
      );
      const effectiveWorkspacePaths = parsePnpmWorkspaceRows(independentPnpmResult.stdout)
        .map((row) => path.resolve(row.path))
        .map((directory) => path.relative(repoRoot, directory).split(path.sep).join('/') || '.')
        .sort();
      const renderedWorkspacePaths = workspaces.map((workspace) => workspace.path).sort();
      const paths = new Set(workspaces.map((workspace) => workspace.path));
      const output = renderRepositoryMap(workspaces, facts, '2026-08-06');
      assert.deepEqual(renderedWorkspacePaths, effectiveWorkspacePaths);
      assert.equal(new Set(renderedWorkspacePaths).size, renderedWorkspacePaths.length);
      assert.ok(facts.components.length > 0);
      assert.ok(facts.documents.length > 0);
      assert.equal(paths.has('packages/@dvt/temporal-http-json-plugin'), true);
      assert.equal(paths.has('packages/@dvt/temporal-object-file-postgres-plugin'), true);
      assert.match(output, /docs\/contracts\/index\.md/u);
      assert.match(output, /ambiguous-canonical-doc-binding/u);
      assert.match(output, /missing-canonical-doc-binding/u);
      assert.doesNotMatch(output, /documentation_panel_query/u);
      assert.equal(
        new Set(topology.components.map((component) => component.componentId)).size,
        topology.components.length
      );
      assert.equal(topology.relationCount, topologyFacts.relations.length);
      assert.ok(topology.components.length > 0);
      assert.ok(topology.relationCount > 0);
      assert.ok(
        topology.globalGaps.every((gap) => gap.startsWith('orphan-canonical-document-binding:'))
      );

      const outputPath = path.join(repoRoot, '.generated-docs', 'concepts', 'repository-map.md');
      await main(['--repository-map-only']);
      const firstGeneration = fs.readFileSync(outputPath);
      const firstModifiedAt = fs.statSync(outputPath, { bigint: true }).mtimeNs;
      const messages = [];
      const originalLog = console.log;
      console.log = (...values) => messages.push(values.join(' '));
      try {
        await main(['--repository-map-only']);
      } finally {
        console.log = originalLog;
      }
      assert.deepEqual(fs.readFileSync(outputPath), firstGeneration);
      assert.equal(fs.statSync(outputPath, { bigint: true }).mtimeNs, firstModifiedAt);
      assert.ok(messages.some((message) => message.includes('already up to date')));

      const componentOutputPath = path.join(
        repoRoot,
        '.generated-docs',
        'architecture',
        'component-map.md'
      );
      await main(['--component-map-only']);
      const firstComponentGeneration = fs.readFileSync(componentOutputPath);
      const firstComponentModifiedAt = fs.statSync(componentOutputPath, { bigint: true }).mtimeNs;
      messages.length = 0;
      console.log = (...values) => messages.push(values.join(' '));
      try {
        await main(['--component-map-only']);
      } finally {
        console.log = originalLog;
      }
      assert.deepEqual(fs.readFileSync(componentOutputPath), firstComponentGeneration);
      assert.equal(
        fs.statSync(componentOutputPath, { bigint: true }).mtimeNs,
        firstComponentModifiedAt
      );
      assert.ok(messages.some((message) => message.includes('already up to date')));
    } finally {
      await client.end();
    }
  }
);
