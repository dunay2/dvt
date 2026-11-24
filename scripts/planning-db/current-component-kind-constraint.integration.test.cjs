/** Owned concern: prove the fixed kind operation preserves real PostgreSQL authority. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { Client } = require('pg');
const { randomUuidV4, sha256HexUtf8 } = require('@dvt/crypto');
const { readCurrentPlanningDbSchema } = require('./current-schema.cjs');
const schema = require('../planning-db-schema.cjs');
const table = 'architecture.component';
const constraint = 'architecture_component_kind_check';
const before =
  "CHECK ((kind = ANY (ARRAY['package'::text, 'module'::text, 'port'::text, 'adapter'::text, 'service'::text, 'ui-view'::text, 'workflow'::text, 'dbt-model'::text, 'api'::text])))";

function governanceFixture(componentId, owns) {
  const root = { id: 'SYS-TEST', name: 'Test system', level: 'system', status: 'review' };
  return {
    component_id: componentId,
    source_path: 'fixture',
    name: componentId,
    level: 'component',
    parent_id: root.id,
    root_unit: root.id,
    domain_unit: root.id,
    unit_path: [root.id, componentId],
    status: 'review',
    governance_state: 'review',
    canonical_role: 'none',
    evidence_state: 'review-required',
    is_drift: false,
    is_legacy: false,
    children_required: false,
    file_count: 0,
    ddd_owner: 'Test',
    cq_rails: 'none - isolated documentary fixture',
    owns,
    excludes: [],
    governance_refs: [],
    fowler_signals: [],
    source_content_sha256: 'a'.repeat(64),
    raw_component: {
      id: componentId,
      name: componentId,
      level: 'component',
      status: 'review',
      ownedConcern: 'Isolated source ownership',
      unitReferences: [
        root,
        { id: componentId, name: componentId, level: 'component', status: 'review' },
      ],
    },
  };
}

test('fixed kind CHECK preserves native rows/objects and proves admission, CAS, rejection and rollback', async () => {
  const adminUrl = schema.databaseUrl();
  const name = 'dvt_planning_test_kind_' + randomUuidV4().replaceAll('-', '');
  assert.match(name, /^dvt_planning_test_kind_[a-f0-9]+$/u);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  let client;
  try {
    await admin.query('create database "' + name + '"');
    const url = new URL(adminUrl);
    url.pathname = '/' + name;
    assert.notEqual(url.pathname, new URL(adminUrl).pathname);
    client = new Client({ connectionString: url.toString() });
    await client.connect();
    await schema.applyCurrentPlanningDbSchema({ client, silent: true });
    await client.query(
      "insert into architecture.component (component_id,name,kind,layer,owner,repo_path,public_contract,runtime,criticality,status) values ('KEEP','Keep','module','infra','Test','fixture','Keep','none','medium','review')"
    );
    await client.query(
      "insert into architecture.design (design_id,work_item_id,title,owner,status,rationale,rail_ref) values ('KEEP','GH-3951','Keep','Test','review','Unrelated authority','RecordArchitectureComponent')"
    );
    await client.query('create index preserved_kind_test_owner on architecture.component(owner)');
    const components = (
      await client.query('select * from architecture.component order by component_id')
    ).rows;
    const designs = (await client.query('select * from architecture.design order by design_id'))
      .rows;
    const definition = async () =>
      (
        await client.query(
          'select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid=$1::regclass and conname=$2',
          [table, constraint]
        )
      ).rows[0].definition;
    const restore = (value) =>
      client.query(
        `alter table ${table} drop constraint ${constraint}, add constraint ${constraint} ${value}`
      );
    await restore(before);
    const options = {
      client,
      expectedSchemaSha256: sha256HexUtf8(readCurrentPlanningDbSchema()),
      expectedConstraintSha256: sha256HexUtf8(await definition()),
    };
    await assert.rejects(
      schema.reviseComponentKindConstraint({
        ...options,
        expectedConstraintSha256: 'a'.repeat(64),
      }),
      /CAS/
    );
    assert.equal(await definition(), before);
    const result = await schema.reviseComponentKindConstraint(options);
    assert.equal(result.beforeStateSha256, result.afterStateSha256);
    assert.equal(result.afterDefinitionSha256, sha256HexUtf8(await definition()));
    assert.deepEqual(
      (await client.query('select * from architecture.component order by component_id')).rows,
      components
    );
    assert.deepEqual(
      (await client.query('select * from architecture.design order by design_id')).rows,
      designs
    );
    await client.query(
      "insert into architecture.component (component_id,name,kind,layer,owner,repo_path,public_contract,runtime,criticality,status) values ('DOC','Doc','documentary-collection','infra','Test','docs','Passive collection','none','medium','review')"
    );
    await assert.rejects(
      client.query("update architecture.component set kind='unknown' where component_id='DOC'"),
      /architecture_component_kind_check/
    );
    await client.query("delete from architecture.component where component_id='DOC'");
    await assert.rejects(
      schema.reviseComponentKindConstraint({
        ...options,
        expectedConstraintSha256: sha256HexUtf8(await definition()),
      }),
      /Unexpected/
    );
    await restore(before.replace("'api'::text", "'api'::text, 'alien'::text"));
    await assert.rejects(
      schema.reviseComponentKindConstraint({
        ...options,
        expectedConstraintSha256: sha256HexUtf8(await definition()),
      }),
      /Unexpected/
    );
    await restore(before);
    await client.query('create table architecture.kind_child () inherits (architecture.component)');
    await assert.rejects(schema.reviseComponentKindConstraint(options), /inherit|partition/);
    await client.query('drop table architecture.kind_child');
    const query = client.query.bind(client);
    client.query = async (sql, values) => {
      if (typeof sql === 'string' && sql.startsWith('ALTER TABLE ONLY architecture.component ADD'))
        throw new Error('Injected kind DDL failure');
      return query(sql, values);
    };
    await assert.rejects(
      schema.reviseComponentKindConstraint(options),
      /Injected kind DDL failure/
    );
    client.query = query;
    assert.equal(await definition(), before);
    assert.deepEqual(
      (await client.query('select * from architecture.component order by component_id')).rows,
      components
    );
    assert.deepEqual(
      (await client.query('select * from architecture.design order by design_id')).rows,
      designs
    );
  } finally {
    if (client) await client.end();
    await admin.query('drop database if exists "' + name + '" with (force)');
    await admin.end();
  }
});

test('native documentary admission and filtered integrity use current source and effective semantic links', async (t) => {
  const { repository } = require('../lib/feature-mechanization-git-fixture.cjs');
  const op = require('../planning-db-operate.cjs');
  const {
    createComponentIntegrityReadModelComponent,
  } = require('./queries/component-integrity-query.cjs');
  const repo = repository(t);
  repo.write('guide.md', '# Actual guide\n');
  const adminUrl = schema.databaseUrl();
  const name = 'dvt_planning_test_documentary_' + randomUuidV4().replaceAll('-', '');
  assert.match(name, /^dvt_planning_test_documentary_[a-f0-9]+$/u);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  let client;
  try {
    await admin.query('create database "' + name + '"');
    const url = new URL(adminUrl);
    url.pathname = '/' + name;
    assert.notEqual(url.pathname, new URL(adminUrl).pathname);
    client = new Client({ connectionString: url.toString() });
    await client.connect();
    await schema.applyCurrentPlanningDbSchema({ client, silent: true });
    await client.query(
      "insert into planning_query_store.governance_sources (source_path,source_type,content_sha256,source_bytes,raw_source) values ('fixture','governance_component_index',$1,2,'{}')",
      ['a'.repeat(64)]
    );
    for (const row of [
      governanceFixture('SYS-DOC', ['guide.md', 'script.ts']),
      governanceFixture('SYS-CODE', ['model.ts', 'retired.ts']),
    ]) {
      await client.query(
        'insert into planning_query_store.governance_components select * from jsonb_populate_record(null::planning_query_store.governance_components, $1::jsonb)',
        [JSON.stringify(row)]
      );
    }
    await client.query(
      "insert into architecture.component (component_id,name,kind,layer,owner,repo_path,public_contract,runtime,criticality,status) values ('SYS-CODE','Code','module','infra','Test','model.ts','Actual code','node','medium','review')"
    );
    const provenance = [
      '--source-ref',
      'https://example.invalid/documentary-test',
      '--source-content-sha256',
      'a'.repeat(64),
      '--actor',
      'test',
    ];
    await op.applyArchitectureDesignCreateOperation(
      op.parseArgs([
        'architecture-design',
        'create',
        '--design',
        'DOC-NATIVE',
        '--work-item',
        'GH-3951',
        '--title',
        'Isolated native documentary proof',
        '--owner',
        'Test',
        '--rationale',
        'Real current source and native admission',
        '--status',
        'review',
        '--fowler-signal',
        'boundary_drift',
        '--rail-ref',
        'RecordArchitectureComponent;ReviseGovernanceComponent',
        ...provenance,
        '--scope',
        'component:SYS-DOC:may_create',
        '--scope',
        'component:SYS-DOC:may_update',
        '--scope',
        'component:SYS-CODE:may_update',
      ]),
      { client }
    );
    const record = [
      'architecture-component',
      'record',
      '--design',
      'DOC-NATIVE',
      '--component',
      'SYS-DOC',
      '--name',
      'Actual documentary collection',
      '--kind',
      'documentary-collection',
      '--layer',
      'infra',
      '--owner',
      'Test',
      '--repo-path',
      'guide.md',
      '--public-contract',
      'Passive current guide and native semantic links',
      '--runtime',
      'none',
      '--status',
      'review',
      '--responsibility',
      'RESP-DOC|Maintain actual guide|Guide admission changes|Test',
      ...provenance,
      '--idempotency-key',
      'doc-native-record',
    ];
    await assert.rejects(
      op.applyArchitectureComponentRecordOperation(op.parseArgs(record), {
        client,
        gitReader: repo.reader(),
      }),
      /missing_documentary_semantic_link/
    );
    assert.equal(
      (await client.query("select 1 from architecture.component where component_id='SYS-DOC'"))
        .rowCount,
      0
    );
    await op.applyComponentReviseOperation(
      op.parseArgs([
        'component',
        'revise',
        '--design',
        'DOC-NATIVE',
        '--component',
        'SYS-CODE',
        '--governance',
        'guide.md',
        '--expected-revision',
        '0',
        ...provenance,
        '--idempotency-key',
        'native-semantic-doc-link',
      ]),
      { client }
    );
    assert.deepEqual(
      (
        await client.query(
          "select governance_refs from planning_query_store.governance_components where component_id='SYS-CODE'"
        )
      ).rows[0].governance_refs,
      [],
      'the imported documentary projection remains unchanged'
    );
    const read = (filters) =>
      createComponentIntegrityReadModelComponent({
        gitReader: repo.reader(),
      }).readComponentIntegrityRows(client, filters);
    assert.equal(
      (await read({ component: 'SYS-DOC', kind: 'component_missing_architecture_authority' }))
        .length,
      1
    );
    await op.applyArchitectureComponentRecordOperation(op.parseArgs(record), {
      client,
      gitReader: repo.reader(),
    });
    assert.deepEqual(
      await read({ component: 'SYS-DOC', kind: 'documentary_component_violation' }),
      []
    );
    assert.equal(
      (await read({ component: 'SYS-DOC', kind: 'component_evidence_gap' })).length,
      1,
      'documentary nature retains missing evidence'
    );
    assert.equal(
      (await read({ component: 'SYS-CODE', kind: 'component_evidence_gap' })).length,
      1,
      'executable metadata/evidence obligations remain unchanged'
    );
    repo.write('script.ts', 'export const executable = true;\n');
    const rows = await read({
      component: 'SYS-DOC',
      kind: 'documentary_component_violation',
      severity: 'error',
      limit: 1,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].path, 'script.ts');
    assert.equal(rows[0].metadata.code, 'non_documentary_artifact');
    const changed = [...record];
    changed[changed.indexOf('--idempotency-key') + 1] = 'doc-native-reject-new-code';
    await assert.rejects(
      op.applyArchitectureComponentRecordOperation(op.parseArgs(changed), {
        client,
        gitReader: repo.reader(),
      }),
      /non_documentary_artifact/
    );
    assert.equal(
      (
        await client.query(
          "select 1 from architecture.design_operations where idempotency_key='doc-native-reject-new-code'"
        )
      ).rowCount,
      0
    );
  } finally {
    if (client) await client.end();
    await admin.query('drop database if exists "' + name + '" with (force)');
    await admin.end();
  }
});
