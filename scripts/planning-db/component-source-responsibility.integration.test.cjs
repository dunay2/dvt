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
} = require('../planning-db-schema.cjs');
const { readCurrentPlanningDbSchema } = require('./current-schema.cjs');
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
    const schemaSha256 = sha256HexUtf8(readCurrentPlanningDbSchema());
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

    // A review descriptor must have an explicit, atomic route to source admission.
    const proposedArgs = args.map((value) =>
      value === 'approved'
        ? 'review'
        : value === 'RESP-MODEL|Publish model|Model changes|Model'
          ? 'RESP-PROPOSED|Publish model|Model changes|Model'
          : value
    );
    await applyArchitectureComponentRecordOperation(parseArgs(proposedArgs), { databaseUrl });
    const approvalBindings = [binding, { ...binding, responsibilityId: 'RESP-PROPOSED' }];
    const approval = parseArgs([
      ...proposedArgs,
      '--expected-responsibility-status',
      'proposed',
      '--responsibility-status',
      'approved',
      '--source-bindings',
      JSON.stringify(approvalBindings),
      '--expected-bindings-hash',
      bindingSetHash([binding]),
    ]);
    const acceptedApproval = await applyArchitectureComponentRecordOperation(approval, {
      databaseUrl,
    });
    assert.equal(
      (
        await client.query(
          "select status from architecture.component_responsibility where responsibility_id='RESP-PROPOSED'"
        )
      ).rows[0].status,
      'approved'
    );
    assert.deepEqual(await readComponentBindings(client, 'SYS-MODEL'), approvalBindings);
    assert.equal(acceptedApproval.responsibilities[0].status, 'approved');
    assert.equal(acceptedApproval.audit.payload.expectedResponsibilityStatus, 'proposed');
    assert.equal(acceptedApproval.audit.payload.responsibilityStatus, 'approved');

    const readPromotionState = async () => {
      const results = await Promise.all([
        client.query('select * from architecture.component order by component_id'),
        client.query(
          'select * from architecture.component_responsibility order by responsibility_id'
        ),
        client.query(
          'select * from architecture.component_source_responsibility order by component_id, responsibility_id, source_path, qualified_symbol'
        ),
        client.query('select * from architecture.design_operations order by operation_id'),
      ]);
      return results.map((result) => result.rows);
    };
    const afterApproval = await readPromotionState();
    assert.equal(
      (await applyArchitectureComponentRecordOperation(approval, { databaseUrl })).idempotent,
      true
    );
    assert.deepEqual(
      await readPromotionState(),
      afterApproval,
      'an exact replay makes no additional writes'
    );
    await assert.rejects(
      applyArchitectureComponentRecordOperation(
        parseArgs([
          ...proposedArgs,
          '--expected-responsibility-status',
          'approved',
          '--responsibility-status',
          'implemented',
          '--idempotency-key',
          approval.idempotencyKey,
        ]),
        { databaseUrl }
      ),
      /idempotency|replay/iu
    );
    assert.deepEqual(await readPromotionState(), afterApproval);

    for (const [label, request, error] of [
      [
        'stale status',
        [
          ...proposedArgs,
          '--name',
          'Must roll back',
          '--expected-responsibility-status',
          'proposed',
          '--responsibility-status',
          'approved',
          '--idempotency-key',
          'stale-promotion',
        ],
        /ARCH-RESPONSIBILITY-STATUS-CONFLICT/u,
      ],
      [
        'missing responsibility',
        [
          ...proposedArgs.map((value) =>
            value === 'RESP-PROPOSED|Publish model|Model changes|Model'
              ? 'RESP-MISSING|Publish model|Model changes|Model'
              : value
          ),
          '--expected-responsibility-status',
          'proposed',
          '--responsibility-status',
          'approved',
        ],
        /ARCH-RESPONSIBILITY-STATUS-CONFLICT/u,
      ],
      [
        'foreign owner',
        [
          ...proposedArgs.map((value) => (value === 'SYS-MODEL' ? 'SYS-OTHER' : value)),
          '--expected-responsibility-status',
          'approved',
          '--responsibility-status',
          'implemented',
        ],
        /ARCH-RESPONSIBILITY-STATUS-CONFLICT/u,
      ],
      [
        'later stale binding digest',
        [
          ...proposedArgs,
          '--name',
          'Must roll back',
          '--expected-responsibility-status',
          'approved',
          '--responsibility-status',
          'implemented',
          '--source-bindings',
          JSON.stringify(approvalBindings),
          '--expected-bindings-hash',
          bindingSetHash([]),
        ],
        /Stale/u,
      ],
      [
        'later invalid binding',
        [
          ...proposedArgs,
          '--name',
          'Must roll back',
          '--expected-responsibility-status',
          'approved',
          '--responsibility-status',
          'implemented',
          '--source-bindings',
          JSON.stringify([{ ...binding, responsibilityId: 'RESP-UNKNOWN' }]),
          '--expected-bindings-hash',
          bindingSetHash(approvalBindings),
        ],
        /Unknown/u,
      ],
    ]) {
      await assert.rejects(
        applyArchitectureComponentRecordOperation(parseArgs(request), { databaseUrl }),
        error
      );
      assert.deepEqual(
        await readPromotionState(),
        afterApproval,
        label + ' must roll back every descriptor, status, binding and audit write'
      );
    }

    await applyArchitectureComponentRecordOperation(
      parseArgs([...proposedArgs, '--idempotency-key', 'ordinary-review-after-approval']),
      { databaseUrl }
    );
    assert.equal(
      (
        await client.query(
          "select status from architecture.component_responsibility where responsibility_id='RESP-PROPOSED'"
        )
      ).rows[0].status,
      'approved',
      'ordinary review registration never downgrades an approved responsibility'
    );

    await applyArchitectureComponentRecordOperation(
      parseArgs(
        proposedArgs.map((value) =>
          value === 'RESP-PROPOSED|Publish model|Model changes|Model'
            ? 'RESP-LATER|Publish later|Later changes|Model'
            : value
        )
      ),
      { databaseUrl }
    );
    const beforeMixedStatuses = await readPromotionState();
    await assert.rejects(
      applyArchitectureComponentRecordOperation(
        parseArgs([
          ...proposedArgs,
          '--responsibility',
          'RESP-LATER|Publish later|Later changes|Model',
          '--expected-responsibility-status',
          'approved',
          '--responsibility-status',
          'implemented',
        ]),
        { databaseUrl }
      ),
      /ARCH-RESPONSIBILITY-STATUS-CONFLICT/u
    );
    assert.deepEqual(
      await readPromotionState(),
      beforeMixedStatuses,
      'a stale second member rolls back the first member promotion too'
    );

    const implemented = await applyArchitectureComponentRecordOperation(
      parseArgs([
        ...proposedArgs,
        '--expected-responsibility-status',
        'approved',
        '--responsibility-status',
        'implemented',
      ]),
      { databaseUrl }
    );
    assert.equal(implemented.responsibilities[0].status, 'implemented');
    assert.equal(
      (
        await client.query(
          "select status from architecture.component_responsibility where responsibility_id='RESP-PROPOSED'"
        )
      ).rows[0].status,
      'implemented'
    );
    assert.deepEqual(
      await readComponentBindings(client, 'SYS-MODEL'),
      approvalBindings,
      'omitting the binding replacement preserves current bindings'
    );

    const raceArgs = proposedArgs.map((value) =>
      value === 'RESP-PROPOSED|Publish model|Model changes|Model'
        ? 'RESP-RACE|Publish once|Concurrent changes|Model'
        : value
    );
    await applyArchitectureComponentRecordOperation(parseArgs(raceArgs), { databaseUrl });
    const beforeRace = await readPromotionState();
    const races = await Promise.allSettled(
      ['one', 'two'].map((name) =>
        applyArchitectureComponentRecordOperation(
          parseArgs([
            ...raceArgs,
            '--name',
            'Winner ' + name,
            '--expected-responsibility-status',
            'proposed',
            '--responsibility-status',
            'approved',
            '--idempotency-key',
            'promotion-race-' + name,
          ]),
          { databaseUrl }
        )
      )
    );
    assert.equal(races.filter((result) => result.status === 'fulfilled').length, 1);
    assert.match(
      races.find((result) => result.status === 'rejected').reason.message,
      /ARCH-RESPONSIBILITY-STATUS-CONFLICT/u
    );
    const afterRace = await readPromotionState();
    assert.equal(
      afterRace[3].length,
      beforeRace[3].length + 1,
      'only the accepted promotion is audited'
    );
    assert.equal(
      afterRace[0][0].name,
      races.find((result) => result.status === 'fulfilled').value.component.name
    );
    assert.deepEqual(afterRace[2], beforeRace[2]);
    assert.deepEqual(
      afterRace[1],
      beforeRace[1].map((row) =>
        row.responsibility_id === 'RESP-RACE' ? { ...row, status: 'approved' } : row
      )
    );
  } finally {
    if (client) await client.end();
    await admin.query('drop database if exists "' + name + '"');
    await admin.end();
  }
});
