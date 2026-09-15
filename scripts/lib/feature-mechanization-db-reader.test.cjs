/** Owned concern: prove read-only authority freshness and database resource ownership. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  readFeatureMechanizationManifestRowsFromDb,
} = require('./feature-mechanization-db-reader.cjs');

test('empty authority rejects without attempting bootstrap', async () => {
  let imports = 0;
  await assert.rejects(
    readFeatureMechanizationManifestRowsFromDb({
      client: { query: async () => ({ rows: [] }) },
      deps: {
        runPlanningImport: async () => {
          imports += 1;
        },
      },
    }),
    /empty.*explicit bootstrap/
  );
  assert.equal(imports, 0);
});

for (const rows of [
  [{ source_path: 'source.md', source_content_sha256: 'old' }],
  [{ source_path: 'another.md', source_content_sha256: 'current' }],
  [
    { source_path: 'source.md', source_content_sha256: 'current' },
    { source_path: 'source.md', source_content_sha256: 'old' },
  ],
]) {
  test(`stale or missing effective declarations reject: ${JSON.stringify(rows)}`, async () => {
    let imports = 0;
    await assert.rejects(
      readFeatureMechanizationManifestRowsFromDb({
        client: { query: async () => ({ rows }) },
        currentSourceHashes: new Map([['source.md', 'current']]),
        refresh: false,
        deps: {
          runPlanningImport: async () => {
            imports += 1;
          },
        },
      }),
      /stale.*source.md.*RecordFeatureMechanizationRail/
    );
    assert.equal(imports, 0);
  });
}

test('local-only effective authority is sufficient and uses its declared content hash', async () => {
  const rows = [
    {
      source_path: 'source.md',
      source_content_sha256: 'current',
      raw_manifest: { featureId: 'LOCAL' },
    },
  ];
  let reads = 0;
  const result = await readFeatureMechanizationManifestRowsFromDb({
    currentSourceHashes: new Map([['source.md', 'current']]),
    client: {
      query: async (sql) => {
        reads += 1;
        assert.match(sql, /source_content_sha256/);
        assert.match(sql, /feature_mechanization_local_rails/);
        assert.match(sql, /0 as projection_priority/);
        assert.match(sql, /where projection_rank = 1/);
        return { rows };
      },
      end: async () => {
        assert.fail('Caller owns this client');
      },
    },
  });
  assert.equal(reads, 1);
  assert.equal(result, rows);
});

for (const failAt of [null, 'connect', 'query']) {
  test(`owned database client closes on ${failAt || 'success'}`, async () => {
    const calls = [];
    const operation = readFeatureMechanizationManifestRowsFromDb({
      databaseUrl: 'postgresql://example.invalid/planning',
      deps: {
        Client: class {
          async connect() {
            calls.push('connect');
            if (failAt === 'connect') throw new Error('connection denied');
          }
          async query() {
            calls.push('query');
            if (failAt === 'query') throw new Error('read denied');
            return { rows: [{ source_path: 'source.md', raw_manifest: { featureId: 'TEST' } }] };
          }
          async end() {
            calls.push('end');
          }
        },
      },
    });
    if (failAt) await assert.rejects(operation, /denied/);
    else assert.equal((await operation).length, 1);
    assert.deepEqual(
      calls,
      failAt === 'connect' ? ['connect', 'end'] : ['connect', 'query', 'end']
    );
  });
}

test('validation has no import dependency and the prepush entry uses the read-only reader', () => {
  const reader = fs.readFileSync(
    path.join(__dirname, 'feature-mechanization-db-reader.cjs'),
    'utf8'
  );
  const entry = fs.readFileSync(
    path.join(__dirname, '..', 'check-feature-mechanization.cjs'),
    'utf8'
  );
  assert.doesNotMatch(reader + entry, /planning-db-import|runPlanningImport/);
  assert.match(entry, /require\('\.\/lib\/feature-mechanization-db-reader\.cjs'\)/);
  assert.match(entry, /await readFeatureMechanizationManifestRowsFromDb\(/);
  assert.match(
    entry,
    /await readFeatureMechanizationManifestsFromDb\(\{ baseRef: args\.baseRef \}\)/
  );
});
