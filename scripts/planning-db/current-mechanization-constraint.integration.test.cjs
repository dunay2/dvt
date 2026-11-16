/** Owned concern: prove fixed schema changes preserve real native state. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUuidV4, sha256HexUtf8 } = require('@dvt/crypto');
const { readCurrentPlanningDbSchema } = require('./current-schema.cjs');
const schema = require('../planning-db-schema.cjs');
const table = 'planning_query_store.feature_mechanization_local_rails';
const constraint = 'feature_mechanization_local_rails_mechanization_status_check';
const before = "CHECK ((mechanization_status = ANY (ARRAY['closed'::text, 'implemented'::text])))";
const after =
  "CHECK ((mechanization_status = ANY (ARRAY['closed'::text, 'implemented'::text, 'declared'::text])))";

test('fixed CHECK transaction preserves real rows and objects, rejects drift and rolls back', async () => {
  assert.equal(typeof schema.reviseMechanizationStatusConstraint, 'function');
  const adminUrl = schema.databaseUrl();
  const name = 'dvt_planning_test_constraint_' + randomUuidV4().replaceAll('-', '');
  assert.match(name, /^dvt_planning_test_constraint_[a-f0-9]+$/);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  let client;
  try {
    await admin.query('create database "' + name + '"');
    const url = new URL(adminUrl);
    url.pathname = '/' + name;
    client = new Client({ connectionString: url.toString() });
    await client.connect();
    await schema.applyCurrentPlanningDbSchema({ client, silent: true });
    await client.query(`insert into ${table} (rail_id,feature_id,mechanization_status,rail_name,
      normalized_rail_name,rail_type,ddd_owner,source_path,source_content_sha256,raw_rail,raw_manifest,created_by)
      values ('KEEP','GH-3945','implemented','ExistingQuery','existingquery','query','Test','fixture',
        repeat('a',64),'{}','{"opaque":{"preserved":true,"integer":9007199254740993,"decimal":0.123456789012345678901}}','test')`);
    const railRows = (await client.query(`select * from ${table} order by rail_id`)).rows;
    await client.query(
      "insert into architecture.design (design_id, work_item_id, title, owner, status, rationale, rail_ref) values ('KEEP','GH-3945','Keep','Test','review','Preserve','RecordFeatureMechanizationRail')"
    );
    const original = await client.query('select * from architecture.design order by design_id');
    const liveHash = async () =>
      sha256HexUtf8(
        (
          await client.query(
            'select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid=$1::regclass and conname=$2',
            [table, constraint]
          )
        ).rows[0].definition
      );
    const restore = async (definition) =>
      client.query(
        `alter table ${table} drop constraint ${constraint}, add constraint ${constraint} ${definition}`
      );
    await restore(before);
    const args = {
      client,
      expectedSchemaSha256: sha256HexUtf8(readCurrentPlanningDbSchema()),
      expectedConstraintSha256: await liveHash(),
    };
    await assert.rejects(
      schema.reviseMechanizationStatusConstraint({
        ...args,
        expectedConstraintSha256: 'a'.repeat(64),
      }),
      /CAS/
    );
    assert.equal(await liveHash(), args.expectedConstraintSha256);
    const result = await schema.reviseMechanizationStatusConstraint(args);
    assert.equal(result.beforeDefinitionSha256, args.expectedConstraintSha256);
    assert.equal(result.afterDefinitionSha256, await liveHash());
    assert.notEqual(result.beforeDefinitionSha256, result.afterDefinitionSha256);
    assert.equal(result.beforeStateSha256, result.afterStateSha256);
    assert.deepEqual(
      (await client.query(`select * from ${table} order by rail_id`)).rows,
      railRows
    );
    assert.deepEqual(
      (await client.query('select * from architecture.design order by design_id')).rows,
      original.rows
    );
    for (const status of ['declared', 'implemented', 'closed']) {
      assert.equal(
        (
          await client.query(
            `select ${after.slice(6)} as admitted from (values ($1::text)) s(mechanization_status)`,
            [status]
          )
        ).rows[0].admitted,
        true
      );
    }
    await assert.rejects(
      schema.reviseMechanizationStatusConstraint({
        ...args,
        expectedConstraintSha256: await liveHash(),
      }),
      /Unexpected/
    );
    await restore(before.replace("'implemented'::text", "'implemented'::text, 'alien'::text"));
    await assert.rejects(
      schema.reviseMechanizationStatusConstraint({
        ...args,
        expectedConstraintSha256: await liveHash(),
      }),
      /Unexpected/
    );
    await restore(before);
    await client.query(`create table planning_query_store.rail_child () inherits (${table})`);
    await assert.rejects(
      schema.reviseMechanizationStatusConstraint({
        ...args,
        expectedConstraintSha256: await liveHash(),
      }),
      /inherit|partition/
    );
    await client.query('drop table planning_query_store.rail_child');
    const stale = { ...args, expectedConstraintSha256: await liveHash() };
    const query = client.query.bind(client);
    client.query = async (sql, values) => {
      if (typeof sql === 'string' && sql.startsWith(`ALTER TABLE ONLY ${table} ADD`))
        throw new Error('Injected DDL failure');
      return query(sql, values);
    };
    await assert.rejects(schema.reviseMechanizationStatusConstraint(stale), /Injected DDL failure/);
    client.query = query;
    assert.equal(await liveHash(), stale.expectedConstraintSha256);
    assert.deepEqual(
      (await client.query('select * from architecture.design order by design_id')).rows,
      original.rows
    );
  } finally {
    if (client) await client.end();
    await admin.query('drop database if exists "' + name + '" with (force)');
    await admin.end();
  }
});
