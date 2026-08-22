const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const yaml = require('js-yaml');

const {
  PlanningDbExportRunner,
  canonicalArtifactPaths,
  governanceUnitManifestPath,
  governanceUnitNavigationPath,
  planStoreNavigationPath,
} = require('./planning-db-export.cjs');
function createPublicationFixture(repoRoot) {
  const runner = new PlanningDbExportRunner({
    fs,
    os,
    path,
    repoRoot,
    schemaName: 'planning_query_store',
  });
  const dbGovernanceSurface = {
    surfaceName: 'Governance component definition',
    canonicalSource: 'DB-authored component definitions',
    writeRail: 'pnpm planning:db:operate component create|revise|reparent',
    writeRailKind: 'db_command',
    readQueryRail: 'pnpm planning:db:query component-tree|component-metadata',
    projection: 'Explicit publication',
    validation: 'pnpm planning:db:current-schema:check',
    authorityMode: 'database',
  };
  const effectiveComponentDefinitions = [
    {
      componentId: 'SYS-DVT',
      name: 'DVT system',
      parentComponentId: null,
      level: 'system',
      status: 'review',
      owns: [],
      childrenRequired: true,
      dddOwner: 'system',
      cqRails: 'none - root governance unit',
      rawUnit: {
        id: 'SYS-DVT',
        name: 'DVT system',
        level: 'system',
        status: 'review',
        owns: [],
        childrenRequired: true,
        dddOwner: 'system',
        cqRails: 'none - root governance unit',
      },
    },
    {
      componentId: 'SYS-PLANSTORE',
      name: 'Plan store',
      parentComponentId: 'SYS-DVT',
      level: 'domain',
      status: 'review',
      owns: [],
      childrenRequired: true,
      dddOwner: 'PORT',
      cqRails: 'PS-Q03',
      rawUnit: {
        id: 'SYS-PLANSTORE',
        name: 'Plan store',
        parent: 'SYS-DVT',
        level: 'domain',
        status: 'review',
        owns: [],
        childrenRequired: true,
        dddOwner: 'PORT',
        cqRails: 'PS-Q03',
      },
    },
    {
      componentId: 'SYS-API-DOCS',
      name: 'API local documentation',
      parentComponentId: 'SYS-DVT',
      level: 'component',
      status: 'superseded',
      ownedConcern: 'Retired API-local documentation ownership.',
      owns: [],
      childrenRequired: false,
      dddOwner: 'INFRA',
      cqRails: 'none - API local documentation',
      rawUnit: {
        id: 'SYS-API-DOCS',
        name: 'API local documentation',
        parent: 'SYS-DVT',
        level: 'component',
        status: 'superseded',
        ownedConcern: 'Retired API-local documentation ownership.',
        owns: [],
        childrenRequired: false,
        dddOwner: 'INFRA',
        cqRails: 'none - API local documentation',
      },
    },
  ];
  const client = {
    async query(sql) {
      const text = String(sql);
      if (text.includes('governance_unit_query definition')) {
        return { rows: effectiveComponentDefinitions };
      }
      if (text.includes('db_governance_surfaces surface')) {
        return { rows: [dbGovernanceSurface] };
      }
      if (text.includes('from architecture.design design')) {
        return { rows: [{ lastReviewedAt: '2026-08-10T12:00:00.000Z' }] };
      }
      return { rows: [] };
    },
  };

  return {
    client,
    dbGovernanceSurface,
    effectiveComponentDefinitions,
    runner,
  };
}

test('planning DB export exposes only explicit derived publication artifacts', () => {
  const runner = new PlanningDbExportRunner();

  assert.deepEqual(runner.parseArgs(['--check', '--output-root', 'tmp/export']), {
    check: true,
    outputRoot: path.resolve(__dirname, '..', 'tmp/export'),
  });
  assert.throws(() => runner.parseArgs(['--lane', 'E']), /Unknown planning DB export option/);
  assert.deepEqual(canonicalArtifactPaths, [
    'tools/planning-db/state/db-governance-surfaces.json',
    governanceUnitManifestPath,
    governanceUnitNavigationPath,
    planStoreNavigationPath,
  ]);
});

test('governance surface validations never make DB export a routine gate', () => {
  const catalog = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '..', 'tools', 'planning-db', 'state', 'db-governance-surfaces.json'),
      'utf8'
    )
  );

  for (const surface of catalog.surfaces) {
    assert.doesNotMatch(surface.validation, /(?:planning|governance):db:export(?::check)?/u);
    assert.doesNotMatch(surface.writeRail, /then export/iu);
  }
});

test('planning DB export compares governance YAML by structured meaning', () => {
  const runner = new PlanningDbExportRunner();
  const compact = `---\nversion: 1\nrootUnit: SYS-DVT\nunits:\n  - id: SYS-DVT\n    name: DVT system\n    level: system\n    status: review\n`;
  const formatted = `---\nversion: 1\nrootUnit: SYS-DVT\nunits:\n  - id: SYS-DVT\n    name: DVT system\n    level: system\n    status: review\n\n`;

  assert.equal(
    runner.normalizeArtifactForComparison(governanceUnitManifestPath, compact),
    runner.normalizeArtifactForComparison(governanceUnitManifestPath, formatted)
  );
});

test('planning DB export reads only the rows required by explicit derived projections', async () => {
  const capturedSql = [];
  const runner = new PlanningDbExportRunner({
    schemaName: 'planning_query_store',
  });
  const client = {
    async query(sql) {
      const text = String(sql);
      capturedSql.push(text);
      if (text.includes('from architecture.design design')) {
        return { rows: [{ lastReviewedAt: '2026-08-10T12:00:00.000Z' }] };
      }
      return { rows: [] };
    },
  };

  await runner.readPublicationRows(client);

  assert.ok(capturedSql.some((sql) => /db_governance_surfaces/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /governance_unit_query/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /architecture\.design/u.test(sql)));
  assert.ok(capturedSql.every((sql) => !/feature_mechanization_local_/u.test(sql)));
  assert.ok(capturedSql.every((sql) => !/governance_component_local_/u.test(sql)));
  assert.ok(capturedSql.every((sql) => !/fowler_analysis_/u.test(sql)));
});

test('planning DB export writes derived projections without an integral database snapshot', async () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-db-publication-'));
  const { client, dbGovernanceSurface, runner } = createPublicationFixture('C:/repo');

  try {
    const result = await runner.exportPlanningDerivedSurfaces({ client, outputRoot });
    assert.equal(
      fs.existsSync(path.join(outputRoot, 'tools', 'planning-db', 'state', 'canonical-state.json')),
      false
    );
    assert.deepEqual(
      JSON.parse(
        fs.readFileSync(
          path.join(outputRoot, 'tools/planning-db/state/db-governance-surfaces.json'),
          'utf8'
        )
      ),
      { schemaVersion: 1, surfaces: [dbGovernanceSurface] }
    );
    assert.deepEqual(result.canonicalArtifactPaths, canonicalArtifactPaths);
    const manifest = yaml.load(
      fs.readFileSync(path.join(outputRoot, governanceUnitManifestPath), 'utf8')
    );
    assert.equal(manifest.version, 1);
    assert.equal(manifest.rootUnit, 'SYS-DVT');
    assert.deepEqual(
      manifest.units.find((unit) => unit.id === 'SYS-API-DOCS'),
      {
        id: 'SYS-API-DOCS',
        name: 'API local documentation',
        parent: 'SYS-DVT',
        level: 'component',
        status: 'superseded',
        ownedConcern: 'Retired API-local documentation ownership.',
        owns: [],
        childrenRequired: false,
        dddOwner: 'INFRA',
        cqRails: 'none - API local documentation',
      }
    );
    const unitNavigation = fs.readFileSync(
      path.join(outputRoot, governanceUnitNavigationPath),
      'utf8'
    );
    assert.match(unitNavigation, /Generated from Planning DB authority/u);
    assert.match(unitNavigation, /last_reviewed: 2026-08-10/u);
    assert.match(
      unitNavigation,
      /pnpm planning:db:query units --parent-unit SYS-DVT --no-refresh/u
    );
    assert.doesNotMatch(unitNavigation, /pnpm planning:db:query component-tree --no-refresh/u);
    assert.doesNotMatch(unitNavigation, /repository tracked files:\s*\d+/iu);
    const planStoreNavigation = fs.readFileSync(
      path.join(outputRoot, planStoreNavigationPath),
      'utf8'
    );
    assert.match(planStoreNavigation, /`SYS-PLANSTORE` — Plan store \(`review`\)/u);
    assert.match(planStoreNavigation, /last_reviewed: 2026-08-10/u);
    assert.match(
      planStoreNavigation,
      /pnpm planning:db:query units --component SYS-PLANSTORE --no-refresh/u
    );
    assert.match(
      planStoreNavigation,
      /pnpm planning:db:query component-tree --parent-unit SYS-PLANSTORE --no-refresh/u
    );
    assert.match(
      planStoreNavigation,
      /pnpm planning:db:query files --domain SYS-PLANSTORE --limit 1000 --no-refresh/u
    );
    assert.doesNotMatch(
      planStoreNavigation,
      /planning:db:query (?:component-tree|component-metadata|files) --component SYS-PLANSTORE/u
    );
    assert.doesNotMatch(planStoreNavigation, /StoredPlanExecutabilityValidator/u);
    assert.doesNotMatch(planStoreNavigation, /Repository tracked files/iu);
    assert.equal(
      fs.existsSync(path.join(outputRoot, 'docs', 'planning', 'state', 'agent-lane-e.yaml')),
      false
    );
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

test('planning DB export check rejects derived publication drift', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-db-export-check-'));
  const { client, runner } = createPublicationFixture(repoRoot);
  const catalogPath = path.join(
    repoRoot,
    'tools',
    'planning-db',
    'state',
    'db-governance-surfaces.json'
  );

  try {
    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.writeFileSync(
      catalogPath,
      `${JSON.stringify({ schemaVersion: 1, surfaces: [] }, null, 2)}\n`,
      'utf8'
    );

    await assert.rejects(
      runner.exportPlanningDerivedSurfaces({ check: true, client }),
      /db-governance-surfaces\.json/
    );
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
