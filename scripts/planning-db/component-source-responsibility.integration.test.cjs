/** Owned concern: prove source association transactions against isolated PostgreSQL. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUuidV4, sha256HexUtf8 } = require('@dvt/crypto');
const { Client } = require('pg');
const { defaultPgUrl } = require('../planning-db-run.cjs');
const { repository } = require('../lib/feature-mechanization-git-fixture.cjs');
const {
  createComponentIntegrityReadModelComponent,
} = require('./queries/component-integrity-query.cjs');
const {
  applyCurrentPlanningDbSchema,
  addCurrentPlanningDbTable,
  currentSchemaPath,
} = require('../planning-db-schema.cjs');
const {
  parseArgs,
  applyArchitectureComponentRecordOperation,
} = require('../planning-db-operate.cjs');
const {
  bindingSetHash,
  readComponentBindings,
  replaceComponentBindings,
} = require('./component-source-responsibility-store.cjs');

test('component binding command preserves authority, replaces atomically and rejects stale concurrent writers', async (t) => {
  const adminUrl = process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
  const name = 'dvt_planning_test_bindings_' + randomUuidV4().replaceAll('-', '');
  assert.match(name, /^dvt_planning_test_bindings_[a-f0-9]+$/u);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  let client;
  try {
    await admin.query('create database "' + name + '"');
    const url = new URL(adminUrl);
    url.pathname = '/' + name;
    const databaseUrl = url.toString();
    await applyCurrentPlanningDbSchema({ databaseUrl, silent: true });
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(
      "insert into architecture.design (design_id, work_item_id, title, owner, status, rationale, rail_ref) values ('BINDINGS','GH-3699','Bindings','Test','review','Atomic current associations','RecordArchitectureComponent')"
    );
    await client.query(
      "insert into architecture.design_scope (design_id, subject_kind, subject_id, scope_kind) values ('BINDINGS','component','SYS-MODEL','may_create'),('BINDINGS','component','SYS-MODEL','may_update')"
    );
    const args = [
      'architecture-component',
      'record',
      '--design',
      'BINDINGS',
      '--component',
      'SYS-MODEL',
      '--name',
      'Model',
      '--kind',
      'module',
      '--layer',
      'application',
      '--owner',
      'Test',
      '--repo-path',
      'model.ts',
      '--public-contract',
      'Model',
      '--status',
      'approved',
      '--responsibility',
      'RESP-MODEL|Publish model|Model changes|Model',
      '--source-ref',
      'https://example.invalid/design',
      '--source-content-sha256',
      'a'.repeat(64),
      '--actor',
      'test',
    ];
    await applyArchitectureComponentRecordOperation(parseArgs(args), { databaseUrl });
    // Populate the disposable database's empty projections, without importing any files.
    for (const projection of [
      'component_engineering_component_tree_projection',
      'component_engineering_file_ownership_projection',
      'component_engineering_rule_evaluation_projection',
    ]) {
      await client.query('refresh materialized view planning_query_store.' + projection);
    }
    const repo = repository(t);
    const filter = { component: 'SYS-MODEL', kind: 'component_path_without_files' };
    const readPathGaps = () =>
      createComponentIntegrityReadModelComponent({
        gitReader: repo.reader(),
      }).readComponentIntegrityRows(client, filter);
    assert.deepEqual(await readPathGaps(), [], 'current file exists without imported inventory');
    repo.git('rm', '--quiet', 'model.ts');
    assert.equal((await readPathGaps()).length, 1, 'deleted path must fail');
    await client.query(
      "update architecture.component set repo_path = 'folder' where component_id = 'SYS-MODEL'"
    );
    fs.mkdirSync(require('node:path').join(repo.root, 'folder-other'));
    repo.write('folder-other/model.ts', 'export const other = true;\n');
    assert.equal((await readPathGaps()).length, 1, 'sibling prefix is not a directory member');
    fs.mkdirSync(require('node:path').join(repo.root, 'folder'));
    repo.write('folder/model.ts', 'export const current = true;\n');
    assert.deepEqual(await readPathGaps(), []);
    await client.query(
      "update architecture.component set repo_path = 'model.ts' where component_id = 'SYS-MODEL'"
    );
    // Exercise the explicit addition path on this disposable database only.
    await client.query('drop table architecture.component_source_responsibility');
    const schemaSha256 = sha256HexUtf8(fs.readFileSync(currentSchemaPath, 'utf8'));
    await client.query(
      'alter table architecture.component_responsibility rename to unavailable_responsibility'
    );
    await assert.rejects(
      addCurrentPlanningDbTable({
        databaseUrl,
        table: 'architecture.component_source_responsibility',
        expectedSchemaSha256: schemaSha256,
      }),
      /does not exist/u
    );
    assert.equal(
      (
        await client.query(
          "select to_regclass('architecture.component_source_responsibility') as relation"
        )
      ).rows[0].relation,
      null
    );
    await client.query(
      'alter table architecture.unavailable_responsibility rename to component_responsibility'
    );
    await addCurrentPlanningDbTable({
      databaseUrl,
      table: 'architecture.component_source_responsibility',
      expectedSchemaSha256: schemaSha256,
    });
    await assert.rejects(
      addCurrentPlanningDbTable({
        databaseUrl,
        table: 'architecture.component_source_responsibility',
        expectedSchemaSha256: schemaSha256,
      }),
      /already exists/u
    );
    assert.equal(
      (await client.query('select count(*)::int as n from architecture.component')).rows[0].n,
      1
    );
    const binding = {
      componentId: 'SYS-MODEL',
      responsibilityId: 'RESP-MODEL',
      path: 'model.ts',
      symbol: 'model',
      role: 'implements',
      testPaths: ['model.test.ts'],
    };
    const bind = (values, expected) =>
      parseArgs([
        ...args,
        '--source-bindings',
        JSON.stringify(values),
        '--expected-bindings-hash',
        expected,
      ]);
    const first = bind([binding], bindingSetHash([]));
    await applyArchitectureComponentRecordOperation(first, { databaseUrl });
    assert.deepEqual(await readComponentBindings(client, 'SYS-MODEL'), [binding]);
    assert.equal(
      (await applyArchitectureComponentRecordOperation(first, { databaseUrl })).idempotent,
      true
    );
    const invalid = bind(
      [{ ...binding, responsibilityId: 'RESP-UNKNOWN' }],
      bindingSetHash([binding])
    );
    await assert.rejects(
      applyArchitectureComponentRecordOperation(invalid, { databaseUrl }),
      /Unknown/u
    );
    assert.deepEqual(await readComponentBindings(client, 'SYS-MODEL'), [binding]);
    const attempts = await Promise.allSettled(
      ['second', 'third'].map((symbol) =>
        applyArchitectureComponentRecordOperation(
          bind([{ ...binding, symbol }], bindingSetHash([binding])),
          { databaseUrl }
        )
      )
    );
    assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
    assert.match(attempts.find((result) => result.status === 'rejected').reason.message, /Stale/u);
    await assert.rejects(
      client.query(
        "delete from architecture.component_responsibility where responsibility_id='RESP-MODEL'"
      ),
      /foreign key/iu
    );
    const current = await readComponentBindings(client, 'SYS-MODEL');
    await applyArchitectureComponentRecordOperation(bind([], bindingSetHash(current)), {
      databaseUrl,
    });
    assert.deepEqual(await readComponentBindings(client, 'SYS-MODEL'), []);

    // Hold the canonical responsibility while an independent component tries to take it.
    // Synchronize on its actual upsert, not elapsed time or a probabilistic race.
    await client.query(
      "insert into architecture.design_scope (design_id, subject_kind, subject_id, scope_kind) values ('BINDINGS','component','SYS-OTHER','may_create')"
    );
    const other = new Client({ connectionString: databaseUrl });
    await other.connect();
    try {
      await client.query('begin');
      await client.query(
        "select 1 from architecture.component_responsibility where responsibility_id='RESP-MODEL' for share"
      );
      let reachedUpsert;
      const upsertAttempted = new Promise((resolve) => {
        reachedUpsert = resolve;
      });
      const moving = applyArchitectureComponentRecordOperation(
        parseArgs(args.map((value) => (value === 'SYS-MODEL' ? 'SYS-OTHER' : value))),
        {
          client: {
            query: (sql, values) => {
              if (sql.includes('insert into architecture.component_responsibility'))
                reachedUpsert();
              return other.query(sql, values);
            },
          },
        }
      );
      // Attach the rejection handler before releasing the competing transaction.
      const rejectedMove = assert.rejects(moving, /Cannot reassign/u);
      await upsertAttempted;
      await replaceComponentBindings(client, {
        componentId: 'SYS-MODEL',
        sourceBindings: [binding],
        expectedBindingsHash: bindingSetHash([]),
      });
      await client.query('commit');
      await rejectedMove;
      assert.equal(
        (
          await client.query(
            "select component_id from architecture.component_responsibility where responsibility_id='RESP-MODEL'"
          )
        ).rows[0].component_id,
        'SYS-MODEL'
      );
      assert.deepEqual(await readComponentBindings(client, 'SYS-MODEL'), [binding]);
    } finally {
      await client.query('rollback');
      await other.end();
    }
  } finally {
    if (client) await client.end();
    await admin.query('drop database if exists "' + name + '"');
    await admin.end();
  }
});
