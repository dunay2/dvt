/** Real PostgreSQL proof: the inspection consumer rewrites with native evidence, without changing producer bytes. */
import { createRequire } from 'node:module';
import { URL } from 'node:url';

import { renderPostgresAst, simplifyPostgresSqlAst } from '@dvt/postgres-projection';
import { Client } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { parsePostgresTransformSqlStructure } from '../../../src/application/services/postgresTransformSqlPolicy.js';
import { PostgresSqlPresentationEvidenceReader } from '../../../src/infrastructure/warehouseSourceImport/PostgresSqlPresentationEvidenceReader.js';

import { createSqlReadTables, seedSqlReadDataset, sqlReadDatasets } from './fixtures.js';
import { comparePostgresSql } from './oracle.js';
import { presentationFixture } from './presentation.fixtures.js';

type Lease = Readonly<{ url: string; dispose(): Promise<void> }>;
const { allocateDisposablePostgresDatabase } = createRequire(import.meta.url)(
  '../../../../../scripts/disposable-postgres-database.cjs'
) as { allocateDisposablePostgresDatabase(url: string, label: string): Promise<Lease> };
const adminUrl = process.env.DVT_PG_URL;

describe.skipIf(adminUrl === undefined)('Native readable SQL inspection', () => {
  let lease: Lease, client: Client;
  beforeAll(async () => {
    if (adminUrl === undefined) throw new Error('Native PostgreSQL URL is required.');
    lease = await allocateDisposablePostgresDatabase(adminUrl, 'sqlread_3786');
    client = new Client({ connectionString: lease.url });
    await client.connect();
    await createSqlReadTables(client);
  });
  afterAll(async () => {
    try {
      await client?.end();
    } finally {
      await lease?.dispose();
    }
  });
  afterEach(async () => {
    await client.query(`drop view if exists public.clientes, public.pedidos, public.volatile_orders, raw.client_view;
      drop schema if exists custom cascade; drop schema if exists cast_proof cascade;
      drop table if exists raw.child, raw.parent;
      alter table raw.orders drop column if exists order_date;
      alter table raw.items disable row level security`);
  });

  it('observes complete real columns and proves builtin scalar resolution', async () => {
    const f = presentationFixture(lease.url);
    const evidence = await f.reader.read({
      credentialRef: 'proof-credential',
      database: new URL(lease.url).pathname.slice(1),
      relations: [{ schema: 'raw', table: 'orders' }],
    });
    expect(evidence).toEqual({
      currentDatabase: new URL(lease.url).pathname.slice(1),
      resolvedColumns: [
        { schema: 'raw', table: 'orders', columns: ['order_id', 'client_id', 'amount'] },
      ],
      scalarSemantics: 'pg_catalog',
    });
  });

  for (const dataset of sqlReadDatasets)
    it(`rewrites the external-producer JOIN with equivalent names, types, NULLs and duplicates: ${dataset.name}`, async () => {
      await seedSqlReadDataset(client, dataset);
      const f = presentationFixture(lease.url),
        originalDocument = globalThis.structuredClone(f.draft);
      const original = await f.query.execute(f.request, f.context);
      const result = await f.query.execute({ ...f.request, presentation: 'readable' }, f.context);
      expect(result.sql).toBe(original.sql);
      expect(result.provenance).toEqual(original.provenance);
      expect(result.presentation?.status).toBe('rewritten');
      if (result.presentation?.status !== 'rewritten')
        throw new Error(JSON.stringify(result.presentation));
      expect(result.presentation.steps.length).toBeGreaterThan(0);
      expect(result.presentation.sql.match(/select/gi)).toHaveLength(1);
      expect(await comparePostgresSql(client, original.sql, result.presentation.sql)).toEqual({
        equivalent: true,
        reason: 'equal',
        differences: 0,
      });
      const manual = await parsePostgresTransformSqlStructure(
        'select o.order_id as order_id, o.client_id as client_id, c.client_id as client_client_id, c.country as country from raw.orders o join raw.client c on o.client_id = c.client_id'
      );
      if (manual.status !== 'valid') throw new Error('Expected valid equivalent manual JOIN.');
      const evidence = await f.reader.read({
        credentialRef: 'proof-credential',
        database: new URL(lease.url).pathname.slice(1),
        relations: [
          { schema: 'raw', table: 'client' },
          { schema: 'raw', table: 'orders' },
        ],
      });
      if (evidence === null) throw new Error('Expected real native resolution evidence.');
      const manualResult = simplifyPostgresSqlAst(manual.ast, evidence);
      expect(manualResult.retained).toBeUndefined();
      expect(
        await comparePostgresSql(
          client,
          result.presentation.sql,
          await renderPostgresAst(manualResult.ast)
        )
      ).toEqual({ equivalent: true, reason: 'equal', differences: 0 });
      expect(f.draft).toEqual(originalDocument);
      expect((await f.query.execute(f.request, f.context)).sql).toBe(original.sql);
    });

  it('keeps the original query free of catalog IO and supports exact selected-relation scope', async () => {
    const f = presentationFixture(lease.url),
      read = vi.spyOn(f.reader, 'read');
    await f.query.execute(f.request, f.context);
    expect(read).not.toHaveBeenCalled();
    const result = await f.query.execute(
      { ...f.request, relationId: f.physicalRelationId, presentation: 'readable' },
      f.context
    );
    expect(result.relationId).toBe(f.physicalRelationId);
    expect(result.provenance.modelRefs).toBeUndefined();
    expect(read).toHaveBeenCalledWith(
      expect.objectContaining({ relations: [{ schema: 'raw', table: 'client' }] })
    );
  });

  it('does not certify a custom comparison operator on the effective search path', async () => {
    await client.query(
      "create schema custom; create function custom.eq(text,text) returns boolean language sql immutable as 'select true'; create operator custom.= (leftarg=text,rightarg=text,function=custom.eq)"
    );
    const url = new URL(lease.url);
    url.searchParams.set('options', '-csearch_path=custom,pg_catalog,public');
    const reader = new PostgresSqlPresentationEvidenceReader({
      credentialResolver: { resolveCredential: async () => url.toString() },
    });
    const evidence = await reader.read({
      credentialRef: 'proof',
      database: url.pathname.slice(1),
      relations: [{ schema: 'raw', table: 'client' }],
    });
    expect(evidence?.resolvedColumns[0]?.columns).toEqual(['client_id', 'country']);
    expect(evidence).not.toHaveProperty('scalarSemantics');
  });

  it('rewrites real dbt-style same-database view references without inlining their definitions', async () => {
    await client.query('alter table raw.orders add column order_date date');
    await client.query(
      'create view public.clientes as select client_id,country from raw.client where client_id is not null; create view public.pedidos as select order_id,client_id,amount from raw.orders where amount is not null'
    );
    await seedSqlReadDataset(client, sqlReadDatasets[1]!);
    const database = new URL(lease.url).pathname.slice(1);
    const parsed = await parsePostgresTransformSqlStructure(
      `select p.order_id as order_id,c.client_id as client_id from "${database}".public.pedidos p join "${database}".public.clientes c on p.client_id=c.client_id where p.amount > 0`
    );
    if (parsed.status !== 'valid') throw new Error('Expected valid compiled dbt-style producer.');
    const f = presentationFixture(lease.url, parsed.ast);
    const original = await f.query.execute(f.request, f.context);
    const result = await f.query.execute({ ...f.request, presentation: 'readable' }, f.context);
    if (result.presentation?.status !== 'rewritten')
      throw new Error(JSON.stringify(result.presentation));
    expect(result.sql).toBe(original.sql);
    expect(result.presentation.sql.match(/select/gi)!.length).toBeLessThan(
      original.sql.match(/select/gi)!.length
    );
    expect(result.presentation.sql).toContain(`${database}.public.pedidos`);
    expect(result.presentation.sql).toContain(`${database}.public.clientes`);
    expect(result.presentation.sql).not.toContain('raw.orders');
    expect(await comparePostgresSql(client, original.sql, result.presentation.sql)).toEqual({
      equivalent: true,
      reason: 'equal',
      differences: 0,
    });
  });

  it('retains a complete view with an unused volatile expression', async () => {
    await client.query(
      'create view public.volatile_orders as select order_id,client_id,random() as unused from raw.orders'
    );
    const parsed = await parsePostgresTransformSqlStructure(
      'select order_id,client_id from public.volatile_orders'
    );
    if (parsed.status !== 'valid') throw new Error('Expected valid SELECT.');
    const f = presentationFixture(lease.url, parsed.ast);
    const result = await f.query.execute({ ...f.request, presentation: 'readable' }, f.context);
    expect(result.presentation).toMatchObject({
      status: 'retained',
      diagnostic: { code: 'unsupported_shape' },
    });
    expect(result.sql).toContain('public.volatile_orders');
  });
  it('retains a referenced non-primitive column before pruning an unused producer output', async () => {
    await client.query('alter table raw.orders add column order_date date');
    const parsed = await parsePostgresTransformSqlStructure(
      'select order_id,client_id,order_date as unused from raw.orders'
    );
    if (parsed.status !== 'valid') throw new Error('Expected valid SELECT.');
    const f = presentationFixture(lease.url, parsed.ast);
    const result = await f.query.execute({ ...f.request, presentation: 'readable' }, f.context);
    expect(result.presentation).toMatchObject({
      status: 'retained',
      diagnostic: { code: 'unsupported_shape' },
    });
    expect(result.sql).toContain('order_date');
  });

  it('retains security-barrier views, missing addresses and row-security tables without partial evidence', async () => {
    await client.query(
      'create view raw.client_view with (security_barrier=true) as select client_id, country from raw.client; alter table raw.items enable row level security'
    );
    const f = presentationFixture(lease.url);
    for (const table of ['client_view', 'missing', 'items'])
      expect(
        await f.reader.read({
          credentialRef: 'proof-credential',
          database: new URL(lease.url).pathname.slice(1),
          relations: [{ schema: 'raw', table }],
        })
      ).toBeNull();
  });

  it('does not certify a custom implicit cast even when its type is outside the admitted profile', async () => {
    await client.query(
      "create schema cast_proof; create type cast_proof.box as (value text); create function cast_proof.to_box(text) returns cast_proof.box language sql immutable as 'select row($1)::cast_proof.box'; create cast (text as cast_proof.box) with function cast_proof.to_box(text) as implicit"
    );
    const f = presentationFixture(lease.url);
    const evidence = await f.reader.read({
      credentialRef: 'proof-credential',
      database: new URL(lease.url).pathname.slice(1),
      relations: [{ schema: 'raw', table: 'client' }],
    });
    expect(evidence?.resolvedColumns[0]?.columns).toEqual(['client_id', 'country']);
    expect(evidence).not.toHaveProperty('scalarSemantics');
  });
  it('does not certify an inheritance tree from a parent-only catalog observation', async () => {
    await client.query(
      'create table raw.parent(id bigint); create table raw.child() inherits(raw.parent)'
    );
    const f = presentationFixture(lease.url);
    expect(
      await f.reader.read({
        credentialRef: 'proof-credential',
        database: new URL(lease.url).pathname.slice(1),
        relations: [{ schema: 'raw', table: 'parent' }],
      })
    ).toBeNull();
  });
});
