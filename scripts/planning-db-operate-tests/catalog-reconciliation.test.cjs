const test = require('node:test');
const assert = require('node:assert/strict');
const {
  catalogRowHash,
  parseCatalogReconciliation,
  planCatalogReconciliation,
} = require('../planning-db/catalog-reconciliation.cjs');

const row = {
  rail_id: 'imported#EXAMPLE',
  feature_id: 'EXAMPLE',
  rail_type: 'command',
  normalized_rail_name: 'configurecanvasdvtnode',
  rail_status: 'implemented',
  source_path: 'docs/retired.md',
  source_content_sha256: 'a'.repeat(64),
  imported_at: '2026-01-01T00:00:00.123456+00:00',
  raw_rail: { name: 'ConfigureCanvasDvtNode', type: 'command', status: 'implemented' },
  raw_manifest: {
    symbols: [
      { name: 'first', owner: 'one' },
      { name: 'second', owner: 'two' },
    ],
    redGreenCycles: [{ id: 'keep-this' }],
    commandQueryRails: [{ name: 'ConfigureCanvasDvtNode', type: 'command', status: 'implemented' }],
  },
};
const request = {
  designId: 'GH-3549',
  actor: 'test',
  idempotencyKey: 'catalog-test',
  changes: [
    {
      origin: 'imported',
      railId: row.rail_id,
      expectedRowSha256: '0'.repeat(64),
      reference: { authorityRef: 'docs/authority.md' },
    },
  ],
};

test('catalog parser admits only explicit metadata patches with unique exact targets', () => {
  assert.deepEqual(parseCatalogReconciliation(request), {
    kind: 'feature_mechanization_rail_record',
    catalogReconciliation: request,
  });
  for (const invalid of [
    { ...request, unexpected: true },
    { ...request, actor: '' },
    { ...request, changes: [] },
    { ...request, changes: [request.changes[0], request.changes[0]] },
    { ...request, changes: [{ ...request.changes[0], origin: 'any' }] },
    {
      ...request,
      changes: [{ ...request.changes[0], reference: { authorityRef: 'x', referenceOnly: false } }],
    },
    {
      ...request,
      changes: [{ ...request.changes[0], source: { commit: 'HEAD', path: 'docs/retired.md' } }],
    },
    {
      ...request,
      changes: [{ ...request.changes[0], source: { commit: 'a'.repeat(40), path: '../outside' } }],
    },
  ])
    assert.throws(() => parseCatalogReconciliation(invalid), /CATALOG/);
});

test('catalog rail retirement admits only an exclusive imported target and explicit reason', () => {
  const change = { ...request.changes[0], railRetirement: { reason: 'Exclusive proof retired' } };
  delete change.reference;
  const command = { ...request, changes: [change] };
  assert.deepEqual(parseCatalogReconciliation(command).catalogReconciliation, command);
  for (const invalid of [
    { ...change, origin: 'local' },
    { ...change, railRetirement: {} },
    { ...change, railRetirement: { reason: '' } },
    { ...change, railRetirement: { reason: ' reason ' } },
    { ...change, railRetirement: { reason: 'Retired', status: 'implemented' } },
    ...['source', 'sourceContent', 'reference', 'evidenceRetirement'].map((key) => ({
      ...change,
      [key]: {},
    })),
  ])
    assert.throws(() => parseCatalogReconciliation({ ...command, changes: [invalid] }), /CATALOG/);
});

test('catalog rail retirement preserves shared evidence and rejects ambiguous or terminal identities', () => {
  const before = structuredClone(row);
  const siblings = Array.from({ length: 5 }, (_, index) => ({
    name: `ProductRail${index}`,
    type: 'query',
    status: 'implemented',
    owner: `Owner${index}`,
  }));
  before.raw_manifest.commandQueryRails.push(...siblings);
  before.raw_manifest.mechanizationStatus = 'implemented';
  const change = {
    origin: 'imported',
    railId: before.rail_id,
    expectedRowSha256: '0'.repeat(64),
    railRetirement: { reason: 'Obsolete proof only; product rails remain active' },
  };
  const project = (input) =>
    planCatalogReconciliation(
      { ...request, changes: [change] },
      [{ origin: 'imported', row: input, snapshot_hash: change.expectedRowSha256 }],
      new Map()
    )[0];
  const original = structuredClone(before);
  const { after } = project(before);
  assert.deepEqual(before, original);
  assert.deepEqual(after, {
    ...before,
    rail_status: 'retired',
    raw_rail: { ...before.raw_rail, status: 'retired' },
    raw_manifest: {
      ...before.raw_manifest,
      commandQueryRails: [{ ...before.raw_rail, status: 'retired' }, ...siblings],
    },
  });
  for (const mutate of [
    (item) => {
      item.rail_status = 'retired';
    },
    (item) => {
      item.raw_rail.status = 'deprecated';
    },
    (item) => {
      item.raw_manifest.commandQueryRails[0].status = 'retired';
    },
    (item) => {
      item.raw_rail.name = 'OtherRail';
    },
    (item) => {
      item.normalized_rail_name = '';
      item.raw_rail.name = '';
      item.raw_manifest.commandQueryRails[0].name = '';
    },
    (item) => {
      item.raw_manifest.commandQueryRails = siblings;
    },
    (item) => {
      item.raw_manifest.commandQueryRails.push(item.raw_rail);
    },
    (item) => {
      delete item.raw_manifest.commandQueryRails;
    },
  ]) {
    const invalid = structuredClone(before);
    mutate(invalid);
    assert.throws(() => project(invalid), /CATALOG/);
  }
});

test('request fingerprint is key-order independent and snapshot CAS requires the native SQL digest', () => {
  assert.equal(catalogRowHash({ a: 1, b: { c: 2 } }), catalogRowHash({ b: { c: 2 }, a: 1 }));
  assert.notEqual(
    catalogRowHash(row),
    catalogRowHash({ ...row, imported_at: '2026-01-01T00:00:00.123+00:00' })
  );
  assert.throws(() => catalogRowHash({ timestamp: new Date() }), /JSON/);
  const command = {
    ...request,
    changes: [{ ...request.changes[0], expectedRowSha256: catalogRowHash(row) }],
  };
  assert.throws(
    () => planCatalogReconciliation(command, [{ origin: 'imported', row }], new Map()),
    /SNAPSHOT/
  );
  assert.throws(
    () =>
      planCatalogReconciliation(
        command,
        [{ origin: 'imported', row, snapshot_hash: 'f'.repeat(64) }],
        new Map()
      ),
    /STALE/
  );
});

test('reference patch preserves heterogeneous symbols, cycles, status and ranking timestamps', () => {
  const input = structuredClone(row);
  const command = {
    ...request,
    changes: [{ ...request.changes[0], expectedRowSha256: catalogRowHash(input) }],
  };
  const [planned] = planCatalogReconciliation(
    command,
    [{ origin: 'imported', row: input, snapshot_hash: catalogRowHash(input) }],
    new Map()
  );
  assert.deepEqual(input, row);
  assert.deepEqual(planned.after, {
    ...row,
    rail_status: 'referenced',
    raw_rail: { ...row.raw_rail, referenceOnly: true, authorityRef: 'docs/authority.md' },
    raw_manifest: {
      ...row.raw_manifest,
      commandQueryRails: [
        {
          ...row.raw_manifest.commandQueryRails[0],
          referenceOnly: true,
          authorityRef: 'docs/authority.md',
        },
      ],
    },
  });
  assert.throws(
    () =>
      planCatalogReconciliation(
        request,
        [{ origin: 'imported', row, snapshot_hash: catalogRowHash(row) }],
        new Map()
      ),
    /STALE/
  );
  assert.throws(
    () => planCatalogReconciliation(command, [{ origin: 'local', row }], new Map()),
    /MISSING/
  );
});

test('source-only patch keeps absent manifest rail arrays and advances only local revision', () => {
  const before = {
    ...row,
    revision: 3,
    updated_at: row.imported_at,
    raw_manifest: { symbols: row.raw_manifest.symbols },
  };
  const source = { commit: 'b'.repeat(40), path: row.source_path };
  const proof = {
    ...source,
    sourcePath: `https://github.com/dunay2/dvt/blob/${source.commit}/${source.path}`,
    contentSha256: row.source_content_sha256,
  };
  const command = {
    ...request,
    changes: [
      { origin: 'local', railId: row.rail_id, expectedRowSha256: catalogRowHash(before), source },
    ],
  };
  const snapshots = [{ origin: 'local', row: before, snapshot_hash: catalogRowHash(before) }];
  const [planned] = planCatalogReconciliation(
    command,
    snapshots,
    new Map([[`${source.commit}:${source.path}`, proof]])
  );
  assert.deepEqual(planned.after, { ...before, revision: 4, source_path: proof.sourcePath });
  assert.throws(() => planCatalogReconciliation(command, snapshots, new Map()), /PROOF/);
});

test('reference patch rejects ambiguous or missing rail entries without fabricating a manifest', () => {
  for (const rails of [undefined, [], [row.raw_rail, row.raw_rail]]) {
    const before = { ...row, raw_manifest: { ...row.raw_manifest, commandQueryRails: rails } };
    if (rails === undefined) delete before.raw_manifest.commandQueryRails;
    const command = {
      ...request,
      changes: [{ ...request.changes[0], expectedRowSha256: catalogRowHash(before) }],
    };
    assert.throws(
      () =>
        planCatalogReconciliation(
          command,
          [{ origin: 'imported', row: before, snapshot_hash: catalogRowHash(before) }],
          new Map()
        ),
      /MANIFEST/
    );
  }
});

test('catalog CLI mode cannot be mixed with ordinary record flags', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { parseArgs } = require('../planning-db-operate.cjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-catalog-request-'));
  try {
    const file = path.join(directory, 'request.json');
    fs.writeFileSync(file, JSON.stringify(request));
    const args = ['feature-mechanization', 'record', '--catalog-reconciliation', file];
    assert.deepEqual(parseArgs(args), parseCatalogReconciliation(request));
    assert.throws(() => parseArgs([...args, '--actor', 'override']), /catalog|CATALOG/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('historical proof verifies a deleted regular file, exact bytes and ancestor commit', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { execFileSync } = require('node:child_process');
  const { sha256Hex } = require('@dvt/crypto');
  const { createGitRepositoryEnvironment } = require('../lib/git-repository-environment.cjs');
  const {
    applyCatalogReconciliation,
    verifyHistoricalSource,
  } = require('../planning-db/catalog-reconciliation-write.cjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-catalog-git-'));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: directory,
      env: createGitRepositoryEnvironment(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  try {
    git('init');
    git('config', 'user.name', 'Catalog fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    git('config', 'core.autocrlf', 'false');
    const bytes = Buffer.from('Historical content\r\n');
    fs.writeFileSync(path.join(directory, 'old.md'), bytes);
    git('add', 'old.md');
    const tree = git('write-tree');
    const commit = git('commit-tree', tree, '-m', 'Historical fixture');
    git('update-ref', 'HEAD', commit);
    assert.throws(
      () => verifyHistoricalSource({ commit, path: 'old.md' }, 'old.md', { repoRoot: directory }),
      /CURRENT/
    );
    fs.unlinkSync(path.join(directory, 'old.md'));
    git('add', '-u');
    const head = git('commit-tree', git('write-tree'), '-p', commit, '-m', 'Retired fixture');
    git('update-ref', 'HEAD', head);
    const proof = verifyHistoricalSource({ commit, path: 'old.md' }, 'old.md', {
      repoRoot: directory,
    });
    assert.equal(proof.contentSha256, sha256Hex(bytes));
    assert.equal(proof.sourcePath, `https://github.com/dunay2/dvt/blob/${commit}/old.md`);
    assert.equal(proof.head, head);
    const fixture = catalogWriterFixture();
    fixture.rows[0].row.source_path = 'old.md';
    fixture.rows[0].row.source_content_sha256 = proof.contentSha256;
    fixture.request.changes = [
      {
        origin: 'imported',
        railId: row.rail_id,
        expectedRowSha256: catalogRowHash(fixture.rows[0].row),
        source: { commit, path: 'old.md' },
      },
    ];
    await applyCatalogReconciliation(fixture.request, {
      client: fixture.client,
      repoRoot: directory,
    });
    const update = fixture.calls.find((sql) => sql.startsWith('update'));
    assert.doesNotMatch(update, /raw_rail\s*=|raw_manifest\s*=|rail_status\s*=/u);
    assert.deepEqual(fixture.rows[0].row.raw_manifest, row.raw_manifest);
    assert.throws(
      () =>
        verifyHistoricalSource({ commit, path: 'old.md' }, 'different.md', { repoRoot: directory }),
      /PATH/
    );
    const unrelated = git('commit-tree', tree, '-m', 'Unrelated fixture');
    assert.throws(
      () =>
        verifyHistoricalSource({ commit: unrelated, path: 'old.md' }, 'old.md', {
          repoRoot: directory,
        }),
      /ANCESTOR/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('catalog writer preserves snapshots, audits once and rejects conflicting retries', async () => {
  const { applyCatalogReconciliation } = require('../planning-db/catalog-reconciliation-write.cjs');
  const fixture = catalogWriterFixture();
  const result = await applyCatalogReconciliation(fixture.request, { client: fixture.client });
  assert.equal(result.idempotent, false);
  assert.equal(result.changed, 2);
  assert.equal(fixture.audits.length, 2);
  assert.deepEqual(fixture.rows[0].row.raw_manifest.symbols, row.raw_manifest.symbols);
  assert.equal(fixture.rows[1].row.revision, 4);
  assert.equal(fixture.rows[1].row.updated_at, row.imported_at);
  assert.equal(fixture.audits[0].payload.before.imported_at, row.imported_at);
  assert.equal(fixture.audits[0].payload.origin, 'imported');
  assert.equal(fixture.audits[0].resulting_revision, 0);
  for (const update of fixture.calls.filter((sql) => sql.startsWith('update'))) {
    assert.match(update, /raw_rail\s*=\s*raw_rail\s*\|\|/u);
    assert.match(update, /raw_manifest\s*=\s*jsonb_set/u);
    assert.doesNotMatch(update, /source_path\s*=|source_content_sha256\s*=/u);
  }
  assert.equal(
    (await applyCatalogReconciliation(fixture.request, { client: fixture.client })).idempotent,
    true
  );
  assert.equal(fixture.audits.length, 2);
  await assert.rejects(
    applyCatalogReconciliation(
      { ...fixture.request, actor: 'different' },
      { client: fixture.client }
    ),
    /IDEMPOTENCY/
  );
  await assert.rejects(
    applyCatalogReconciliation(
      { ...fixture.request, changes: fixture.request.changes.slice(0, 1) },
      { client: fixture.client }
    ),
    /IDEMPOTENCY/
  );
  fixture.audits[1].payload.change.railId = 'changed-receipt';
  await assert.rejects(
    applyCatalogReconciliation(fixture.request, { client: fixture.client }),
    /IDEMPOTENCY/
  );
});

test('catalog writer rolls the entire batch back on stale rows, scope, reference, winner or audit failure', async () => {
  const { applyCatalogReconciliation } = require('../planning-db/catalog-reconciliation-write.cjs');
  for (const failure of ['stale', 'scope', 'reference', 'winner', 'audit', 'metadata']) {
    const fixture = catalogWriterFixture(failure);
    const before = structuredClone(fixture.rows);
    await assert.rejects(
      applyCatalogReconciliation(fixture.request, { client: fixture.client }),
      /CATALOG|Audit failure/
    );
    assert.deepEqual(fixture.rows, before, failure);
    assert.equal(fixture.audits.length, 0, failure);
    assert.equal(fixture.calls.at(-1), 'rollback');
  }
});

function catalogWriterFixture(failure) {
  const rows = [
    { origin: 'imported', row: structuredClone(row) },
    {
      origin: 'local',
      row: {
        ...structuredClone(row),
        rail_id: 'local#EXAMPLE',
        revision: 3,
        updated_at: row.imported_at,
      },
    },
  ];
  const audits = [];
  const calls = [];
  const changes = rows.map((entry) => ({
    origin: entry.origin,
    railId: entry.row.rail_id,
    expectedRowSha256: catalogRowHash(entry.row),
    reference: { authorityRef: 'docs/authority.md' },
  }));
  const command = { ...request, changes };
  if (failure === 'stale') command.changes[1].expectedRowSha256 = 'f'.repeat(64);
  let snapshot;
  let writes = 0;
  const client = {
    query: async (sql, values = []) => {
      calls.push(sql);
      if (sql.includes('to_regclass')) return { rows: [{ ready: true }] };
      if (sql === 'begin') {
        snapshot = structuredClone({ rows, audits });
        return { rows: [] };
      }
      if (sql === 'rollback') {
        rows.splice(0, rows.length, ...snapshot.rows);
        audits.splice(0, audits.length, ...snapshot.audits);
        return { rows: [] };
      }
      if (sql === 'commit' || sql.startsWith('lock table')) return { rows: [] };
      if (sql.includes('from architecture.design_scope'))
        return {
          rows:
            failure === 'scope'
              ? []
              : [
                  'command_query_rails',
                  'feature_mechanization_local_rails',
                  'feature_mechanization_local_operations',
                ].map((name) => ({
                  subject_kind: 'relation',
                  subject_id: `planning_query_store.${name}`,
                  scope_kind: 'may_update',
                })),
        };
      if (sql.includes('from architecture.design'))
        return { rows: [{ design_id: 'GH-3549', status: 'review' }] };
      if (sql.startsWith('select') && sql.includes('feature_mechanization_local_operations'))
        return { rows: audits };
      if (sql.startsWith('select') && sql.includes('to_jsonb(rail)')) {
        assert.match(sql, /sha256_text\(.+stable_jsonb_text\(to_jsonb\(rail\)\)\)/u);
        return {
          rows: rows.map((entry) => ({
            ...structuredClone(entry),
            snapshot_hash: catalogRowHash(entry.row),
            snapshot_text: JSON.stringify(entry.row),
          })),
        };
      }
      if (sql.startsWith('select') && sql.includes('command_query_rail_manifest_query'))
        return {
          rows: [
            {
              feature_id: 'EXAMPLE',
              rail_type: 'command',
              normalized_rail_name: row.normalized_rail_name,
              rail_source: 'local',
              rail_id: failure === 'winner' && writes ? 'changed' : 'winner',
            },
          ],
        };
      if (sql.startsWith('select') && sql.includes('command_query_rail_query')) {
        return {
          rows: values.length
            ? failure === 'reference'
              ? []
              : [{ rail_id: 'authority' }]
            : [
                {
                  rail_type: 'command',
                  normalized_rail_name: row.normalized_rail_name,
                  rail_source: 'local',
                  rail_id: 'authority',
                },
              ],
        };
      }
      if (sql.startsWith('update')) {
        const entry = rows.find((item) => item.row.rail_id === values[0]);
        for (const field of ['source_path', 'source_content_sha256', 'revision']) {
          const parameter = new RegExp(`${field} = \\$(\\d+)`, 'u').exec(sql);
          if (parameter) entry.row[field] = values[Number(parameter[1]) - 1];
        }
        if (sql.includes('jsonb_set')) {
          const patch = JSON.parse(
            values.find(
              (value) => typeof value === 'string' && value.startsWith('{"referenceOnly":')
            )
          );
          const manifestPath = values.find(Array.isArray);
          entry.row.rail_status = 'referenced';
          Object.assign(entry.row.raw_rail, patch);
          Object.assign(entry.row.raw_manifest.commandQueryRails[Number(manifestPath[1])], patch);
        }
        if (failure === 'metadata') entry.row.imported_at = 'changed';
        writes += 1;
        assert.match(sql, /metadata_preserved/u);
        return {
          rowCount: 1,
          rows: [
            {
              snapshot_text: JSON.stringify(entry.row),
              metadata_preserved: failure !== 'metadata',
            },
          ],
        };
      }
      if (sql.startsWith('insert')) {
        if (failure === 'audit' && audits.length === 1) throw new Error('Audit failure');
        assert.match(sql, /jsonb_build_object\('before', \$10::jsonb, 'after', \$11::jsonb\)/u);
        assert.equal(Object.hasOwn(JSON.parse(values[8]), 'before'), false);
        audits.push({
          idempotency_key: values[1],
          actor: values[2],
          resulting_revision: values[7],
          payload: {
            ...JSON.parse(values[8]),
            before: JSON.parse(values[9]),
            after: JSON.parse(values[10]),
          },
        });
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes('affected_references')) return { rows: rows.map((entry) => entry.row) };
      throw new Error(`Unexpected test query: ${sql}`);
    },
  };
  return { client, request: command, rows, audits, calls };
}
