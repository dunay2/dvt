/**
 * @ownedConcern Explicitly revise the one prospective-rail CHECK without rebuilding authority.
 * @baseline ADR-0063, GH-3945: fixed DDL, reviewed source and live-definition CAS.
 */
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { sha256HexUtf8 } = require('@dvt/crypto');
const { readCurrentPlanningDbSchema } = require('./current-schema.cjs');
const { assertCurrentPlanningDbSchema } = require('../planning-db-current-schema-policy.cjs');
const { defaultPgUrl } = require('../planning-db-run.cjs');
const table = 'planning_query_store.feature_mechanization_local_rails';
const constraint = 'feature_mechanization_local_rails_mechanization_status_check';
const previousCheck =
  "CHECK ((mechanization_status = ANY (ARRAY['closed'::text, 'implemented'::text])))";
const currentCheck =
  "CHECK ((mechanization_status = ANY (ARRAY['closed'::text, 'implemented'::text, 'declared'::text])))";

function assertMechanizationConstraintSource(schemaSql) {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../tools/planning-db/schema/mechanization/rails/tables.sql'),
    'utf8'
  );
  if (!schemaSql.includes(source)) throw new Error('Changed canonical constraint source.');
  // This fixed table-only module admits ordinary literals and line comments.
  // Reject other lexical forms; no extracted text is ever executed as DDL.
  const active = source.replace(/'(?:''|[^'])*'|--[^\r\n]*/gu, (token) =>
    token.startsWith('--') ? ' '.repeat(token.length) : token
  );
  const masked = active.replace(/'(?:''|[^'])*'/gu, (token) => ' '.repeat(token.length));
  if (/[/*"$\\']/u.test(masked)) throw new Error('Unsupported canonical constraint declaration.');
  const tables = [
    ...masked.matchAll(
      /^CREATE TABLE planning_query_store\.feature_mechanization_local_rails \([\s\S]*?^\);/gmu
    ),
  ];
  const definitions = [...masked.matchAll(new RegExp('\\bCONSTRAINT ' + constraint + '\\b', 'gu'))];
  if (tables.length !== 1 || definitions.length !== 1)
    throw new Error('Expected one active canonical constraint declaration.');
  const definition = active.slice(tables[0].index, tables[0].index + tables[0][0].length);
  const line = '    CONSTRAINT ' + constraint + ' ' + currentCheck + ',';
  if (!definition.split(/\r?\n/u).includes(line))
    throw new Error('Unexpected canonical constraint declaration.');
}

async function readMechanizationConstraint(client) {
  const result = await client.query(
    `select c.contype, c.convalidated, c.conkey, c.conislocal, c.coninhcount,
    r.relkind, r.relispartition, exists(select 1 from pg_inherits where inhrelid=c.conrelid or inhparent=c.conrelid) as inherits,
    a.attnum, a.atttypid = 'text'::regtype as is_text, pg_get_constraintdef(c.oid) as definition
    from pg_constraint c join pg_class r on r.oid=c.conrelid left join pg_attribute a on a.attrelid=c.conrelid
      and a.attname='mechanization_status' and not a.attisdropped
    where c.conrelid=$1::regclass and c.conname=$2`,
    [table, constraint]
  );
  const row = result.rows[0];
  if (
    row &&
    (row.relkind !== 'r' ||
      row.relispartition ||
      row.inherits ||
      !row.conislocal ||
      row.coninhcount !== 0)
  )
    throw new Error('Inherited or partitioned mechanization CHECKs are inadmissible.');
  if (
    result.rows.length !== 1 ||
    row.contype !== 'c' ||
    row.convalidated !== true ||
    row.is_text !== true ||
    row.conkey?.length !== 1 ||
    row.conkey[0] !== row.attnum
  )
    throw new Error('Unexpected mechanization CHECK identity, column or validation.');
  return row.definition;
}

async function readMechanizationPreservedState(client) {
  const result = await client.query(
    `select jsonb_build_object(
    'columns', (select jsonb_agg(jsonb_build_array(attnum,attname,atttypid,atttypmod,attnotnull,attgenerated,attidentity) order by attnum)
      from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped),
    'constraints', (select jsonb_agg(jsonb_build_array(conname,contype,convalidated,pg_get_constraintdef(oid)) order by conname)
      from pg_constraint where conrelid=$1::regclass and conname<>$2),
    'defaults', (select jsonb_agg(jsonb_build_array(adnum,pg_get_expr(adbin,adrelid)) order by adnum)
      from pg_attrdef where adrelid=$1::regclass),
    'indexes', (select jsonb_agg(pg_get_indexdef(indexrelid) order by indexrelid)
      from pg_index where indrelid=$1::regclass),
    'triggers', (select jsonb_agg(pg_get_triggerdef(oid) order by tgname)
      from pg_trigger where tgrelid=$1::regclass),
    'rows', (select encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\\n' order by rail_id),''),'UTF8')),'hex')
      from planning_query_store.feature_mechanization_local_rails r)
    ) as state`,
    [table, constraint]
  );
  return sha256HexUtf8(JSON.stringify(result.rows[0].state));
}

async function reviseMechanizationStatusConstraint(options = {}) {
  if (
    Object.keys(options).some(
      (key) =>
        !['client', 'databaseUrl', 'expectedSchemaSha256', 'expectedConstraintSha256'].includes(key)
    )
  )
    throw new Error('Unsupported fixed CHECK option; caller SQL and identities are forbidden.');
  const schemaSql = assertCurrentPlanningDbSchema(readCurrentPlanningDbSchema());
  const schemaSha256 = sha256HexUtf8(schemaSql);
  if (schemaSha256 !== options.expectedSchemaSha256)
    throw new Error('Reviewed schema digest does not match.');
  assertMechanizationConstraintSource(schemaSql);
  if (!/^[a-f0-9]{64}$/u.test(options.expectedConstraintSha256 || ''))
    throw new Error('Exact live constraint-definition digest required.');
  const client =
    options.client ||
    new Client({
      connectionString:
        options.databaseUrl ||
        process.env.DVT_PLANNING_DB_URL ||
        process.env.DATABASE_URL ||
        defaultPgUrl,
    });
  let started = false;
  try {
    if (!options.client) await client.connect();
    await client.query('begin');
    started = true;
    await client.query(
      "select pg_advisory_xact_lock(hashtext('dvt:planning-db'), hashtext('current-schema'))"
    );
    await client.query('LOCK TABLE ' + table + ' IN ACCESS EXCLUSIVE MODE');
    const before = await readMechanizationConstraint(client);
    const beforeDefinitionSha256 = sha256HexUtf8(before);
    if (beforeDefinitionSha256 !== options.expectedConstraintSha256)
      throw new Error('Stale constraint definition CAS.');
    if (before !== previousCheck)
      throw new Error('Unexpected previous mechanization CHECK definition.');
    const beforeStateSha256 = await readMechanizationPreservedState(client);
    await client.query('ALTER TABLE ONLY ' + table + ' DROP CONSTRAINT ' + constraint);
    await client.query(
      'ALTER TABLE ONLY ' + table + ' ADD CONSTRAINT ' + constraint + ' ' + currentCheck
    );
    const after = await readMechanizationConstraint(client);
    const afterStateSha256 = await readMechanizationPreservedState(client);
    if (after !== currentCheck || beforeStateSha256 !== afterStateSha256)
      throw new Error('Mechanization CHECK poststate or preserved state drift.');
    await client.query('commit');
    return {
      table,
      constraint,
      schemaSha256,
      beforeDefinitionSha256,
      afterDefinitionSha256: sha256HexUtf8(after),
      beforeStateSha256,
      afterStateSha256,
    };
  } catch (error) {
    if (started) await client.query('rollback');
    throw error;
  } finally {
    if (!options.client) await client.end();
  }
}

module.exports = { reviseMechanizationStatusConstraint };
