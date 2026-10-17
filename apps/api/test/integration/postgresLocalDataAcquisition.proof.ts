/**
 * Owned concern: prove the real pg-cursor -> typed codec -> native DuckDB boundary on the existing CI service.
 * @baseline #3394: no mock database, no Preview transport, and no READY before source closure.
 * @decision Use only the explicitly supplied loopback dvt_test service and its non-bypass reader role.
 * @consequence This is adapter proof, not a publicly composed capture command or global resource benchmark.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parsePostgresDvtPublicationMarker } from '@dvt/adapter-postgres';
import { buildRelationalSourceObjectId, createLocalDataCaptureIdV1, createLocalDatasetIdV1,
  type LocalDataAcquisitionPolicyV1 } from '@dvt/contracts';
import { Client } from 'pg';
import Cursor from 'pg-cursor';
import { afterAll, afterEach, beforeAll, it, vi } from 'vitest';

import { DuckDbGenerationStore } from '../../src/infrastructure/duckdb/DuckDbGenerationStore.js';
import { DuckDbLocalDataRuntime } from '../../src/infrastructure/duckdb/DuckDbLocalDataRuntime.js';
import { PostgresRemoteDatasetReader } from '../../src/infrastructure/postgres/PostgresRemoteDatasetReader.js';
import type { PostgresDatasetCursor } from '../../src/infrastructure/postgres/PostgresRemoteDatasetCursor.js';
import { WorkspaceWarehouseConnectionProbe } from '../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';
import { AUTHORIZATION_ACTION_NAME } from '../../src/application/ports/accessDecision.js';
import type { AuthAuditEvent } from '../../src/application/ports/auth.js';
import type { IRemoteDatasetReader, LocalDataCaptureLimits, LocalDataCaptureWriterFactory } from '../../src/application/ports/localDataAcquisition.js';
import type { PrincipalGrantSnapshot } from '../../src/application/ports/principalGrantRepository.js';
import { AuthorizeCommandScopeService } from '../../src/application/services/authorizeCommandScopeService.js';
import { CaptureLocalDatasetUseCase } from '../../src/application/services/captureLocalDatasetUseCase.js';
import { EmbeddedAccessDecisionService } from '../../src/infrastructure/auth/embeddedAccessDecisionService.js';
import { WorkspaceWarehouseConnectionCatalog, WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH } from '../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';
import { LocalWorkspaceMetadataFileRepository } from '../../src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.js';
import type { LocalDataAuthorizationLease } from '../../src/application/services/localDataAuthorizationLease.js';
import type { LocalDataConfiguration } from '../../src/plugins/localDataEnv.js';

function requiredService(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Explicit LOCAL acquisition PostgreSQL proof service is required.');
  const url = new URL(value);
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.pathname !== '/dvt_test') {
    throw new Error('Refusing non-disposable PostgreSQL proof database.');
  }
  return value;
}
const adminUrl = requiredService('DVT_LOCAL_DATA_TEST_ADMIN_URL');
const readerUrl = requiredService('DVT_LOCAL_DATA_TEST_READ_URL');
const admin = new Client({ connectionString: adminUrl });
const readerUser = decodeURIComponent(new URL(readerUrl).username);
const schema = `local_capture_${randomUUID().replaceAll('-','')}`;
const q = (value: string) => `"${value.replaceAll('"','""')}"`;
const scope = { tenantId:'proof',projectId:'proof',environmentId:'test' };
const limits = { maxRows:4096,maxLogicalBytes:4194304 };
const access = (): Pick<LocalDataAuthorizationLease, 'signal' | 'checkpoint' | 'beforePromotion'> => ({ signal:new AbortController().signal,checkpoint:async()=>undefined,beforePromotion:async()=>undefined });
const target = (name: string) => ({ type:'postgres' as const,database:'dvt_test',credentialRef:'postgres:proof',
  objectId:buildRelationalSourceObjectId({kind:'relation',catalog:'dvt_test',schema,name,relationType:'table'}) });
const reader = new PostgresRemoteDatasetReader({resolveCredential:async()=>readerUrl});
let sandbox: string;
let runtime: DuckDbLocalDataRuntime;
let config: Extract<LocalDataConfiguration,{kind:'configured'}>;
let store: DuckDbGenerationStore;
let schemaCreated = false;

beforeAll(async () => {
  await admin.connect();
  const r = new Client({connectionString:readerUrl});
  try {
    await r.connect();
    const flags = (await r.query('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows;
    assert.deepEqual(flags,[{rolsuper:false,rolbypassrls:false}]);
  } finally { await r.end(); }
  await admin.query(`CREATE SCHEMA ${q(schema)}`); schemaCreated = true;
  await admin.query(`GRANT USAGE ON SCHEMA ${q(schema)} TO ${q(readerUser)}`);
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(),'dvt-pg-capture-')));
  const root=path.join(sandbox,'local'), authoring=path.join(sandbox,'authoring');
  await mkdir(root,{mode:0o700}); await mkdir(authoring,{mode:0o700});
  config={kind:'configured',root,workspaceFilesRoot:authoring,memoryLimitBytes:134217728,
    threads:1,maxTempBytes:268435456,maxOpenWorkspaces:1,maxConcurrentSessions:4};
  runtime=new DuckDbLocalDataRuntime(config); store=new DuckDbGenerationStore(runtime,scope,access(),limits);
  await store.initialize();
},20000);
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => {
  try {
    if (runtime) await runtime.close();
    if (schemaCreated) await admin.query(`DROP SCHEMA ${q(schema)} CASCADE`);
  } finally {
    await admin.end();
    if (sandbox) await rm(sandbox,{recursive:true,force:true});
  }
},15000);
async function table(name: string, count=5, ddl='id bigint NOT NULL, value text, active boolean NOT NULL', grant=true) {
  const relation=`${q(schema)}.${q(name)}`;
  await admin.query(`CREATE TABLE ${relation} (${ddl})`);
  if (count) await admin.query(`INSERT INTO ${relation} SELECT 9007199254740993::bigint + n,
    CASE WHEN n%3=0 THEN NULL ELSE 'dato ñ 👩🏽‍💻 ' || n::text END, n%2=0 FROM generate_series(1,$1::int) n`,[count]);
  if (grant) await admin.query(`GRANT SELECT ON ${relation} TO ${q(readerUser)}`);
  return relation;
}
async function collect(name: string, options: Partial<{maxRows:number;maxLogicalBytes:number;timeoutMs:number}>={}) {
  return reader.withCursor({target:target(name),access:access(),limits:{...limits,...options},timeoutMs:options.timeoutMs??10000},async c=>{
    const values: (bigint|boolean|string|null)[][]=[];
    while (true) { const batch=await c.read(1024); values.push(...batch.rows); if(batch.endOfSource)break; }
    return values;
  });
}
async function assertSourceClosed() {
  const connections=await admin.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND application_name='dvt-local-capture'");
  assert.equal(connections.rows[0].n,0);
}

/** Real catalog, policy, reader and writer; grant/audit repositories remain explicit test fixtures. */
async function governed(name: string, budget: LocalDataCaptureLimits = limits) {
  const metadata = new LocalWorkspaceMetadataFileRepository({ root: config.workspaceFilesRoot });
  const catalog = new WorkspaceWarehouseConnectionCatalog({ repository: metadata });
  const connection = await catalog.createConnection(scope, {
    name: `Capture ${name}`, type: 'postgres', database: 'dvt_test', credentialRef: 'postgres:proof', sourceObjects: [],
  });
  const principal = { principalId: 'capture-proof', principalType: 'user' as const, subjectId: 'sub',
    issuer: 'proof', audience: 'dvt', expiresAt: new Date(Date.now() + 60_000), rawScopes: [],
    assertedTenantIds: ['proof'], assertedProjectIds: ['proof'] };
  const state = { grants: {
    principal, suspended: false, tenantAccess: [{ tenantId: 'proof', allowedActions: [], projectAccess: [{
      projectId: 'proof', allowedActions: [], environmentAccess: [{ environmentId: 'test', allowedActions: [
        AUTHORIZATION_ACTION_NAME.workspaceLocalDataCapture, AUTHORIZATION_ACTION_NAME.workspaceSourceImportView,
      ] }],
    }] }],
  } as PrincipalGrantSnapshot | null, audit: [] as AuthAuditEvent[] };
  const authorizer = new AuthorizeCommandScopeService(new EmbeddedAccessDecisionService({
    migrate: async () => undefined, load: async () => state.grants,
  }), { record: async event => { state.audit.push(event); } }, () => new Date());
  const deps = { catalog, authorizer, reader, clock: () => new Date(), limits: budget, batchRows: 1024, timeoutMs: 20000,
    createWriter: ((boundScope, gate, caps) => new DuckDbGenerationStore(runtime, boundScope, gate, caps)) satisfies LocalDataCaptureWriterFactory };
  const command = { localDatasetId: createLocalDatasetIdV1(), captureId: createLocalDataCaptureIdV1(),
    sourceRef: { schemaVersion: 'connected-source-ref.v1' as const,
      connectionRef: { schemaVersion: 'connection-ref.v1' as const, connectionId: connection.id, provider: 'postgres' },
      sourceObjectId: target(name).objectId }, policy: { kind: 'full' as const }, expectedHeadGenerationId: null };
  return { deps, command, context: { scope, principal, requestId: `capture-${name}` }, state, metadata, connection,
    useCase: new CaptureLocalDatasetUseCase(deps) };
}

it('captures 2053 actual rows through governed application ports, then reopens native DuckDB', async()=>{
  const relation=await table('bulk',2053);
  const f = await governed('bulk');
  const { localDatasetId, captureId } = f.command;
  const nativeReads=vi.spyOn(Cursor.prototype,'read');
  const originalAppend = DuckDbGenerationStore.prototype.append;
  let batches = 0;
  vi.spyOn(DuckDbGenerationStore.prototype, 'append').mockImplementation(async function(this: DuckDbGenerationStore, id, rows) {
    const before = nativeReads.mock.calls.length;
    await originalAppend.call(this, id, rows); batches++;
    assert.equal(nativeReads.mock.calls.length, before, 'no speculative native read during append');
    assert.equal(before, batches);
    assert.equal(await store.readHead(localDatasetId), null, 'staging is never READY');
  });
  const originalPromote = DuckDbGenerationStore.prototype.promote;
  vi.spyOn(DuckDbGenerationStore.prototype, 'promote').mockImplementation(async function(this: DuckDbGenerationStore, manifest) {
    await assertSourceClosed();
    return originalPromote.call(this, manifest);
  });
  const { generation: manifest } = await f.useCase.execute(f.command, f.context);
  assert.equal(manifest.rowCount, '2053'); assert.equal(batches, 3); assert.equal(nativeReads.mock.calls.length, 3);
  assert.ok(f.state.audit.length > 0);
  assert.equal(JSON.stringify(manifest).includes('postgres:proof'), false, 'no credential reference in receipt');
  await assertSourceClosed();
  await runtime.close();runtime=new DuckDbLocalDataRuntime(config);store=new DuckDbGenerationStore(runtime,scope,access(),limits);
  await store.initialize();assert.deepEqual(await store.readHead(localDatasetId),manifest);
  const actual=await runtime.withSession(scope,async c=>{
    const key=(await c.runAndReadAll('SELECT relation_key FROM dvt_meta.staged_captures WHERE capture_id=$1',[captureId])).getRows()[0]![0];
    assert.match(String(key),/^r_[0-9a-f]{32}$/u);
    return (await c.runAndReadAll(`SELECT * FROM dvt_store.${key} ORDER BY c0`)).getRows();
  });
  const expected=await admin.query({text:`SELECT * FROM ${relation} ORDER BY id`,rowMode:'array'});
  assert.deepEqual(actual,expected.rows.map(row=>[BigInt(row[0]),row[1],row[2]]));
  console.log('DVT_LOCAL_CAPTURE_PROOF rows=2053 batches=3 bigintExact=true reopened=true sourceClosed=true governed=true');
},25000);

it('keeps one source snapshot while another connection commits new rows',async()=>{
  const rel=await table('snapshot',3);
  await reader.withCursor({target:target('snapshot'),access:access(),limits,timeoutMs:10000},async c=>{
    const one=await c.read(1);
    await admin.query(`INSERT INTO ${rel} VALUES (1,'later',true)`);
    const rest=await c.read(20);
    assert.equal(one.rows.length+rest.rows.length,3);assert.equal(rest.endOfSource,true);
  });
  assert.equal((await collect('snapshot')).length,4);
});
it('closes early FIRST N without claiming EOF or fetching the remainder',async()=>{
  await table('sample',30);
  const reads=vi.spyOn(Cursor.prototype,'read');
  await reader.withCursor({target:target('sample'),access:access(),limits,timeoutMs:10000},async c=>{
    const batch = await c.read(7);
    assert.equal(batch.rows.length,7); assert.equal(batch.endOfSource,false);
    assert.equal(reads.mock.calls.length,1);
  });
  assert.equal(reads.mock.calls.length,1);await assertSourceClosed();
});
it('proves an empty relation and an exactly-at-budget relation without COUNT',async()=>{
  await table('empty',0);assert.deepEqual(await collect('empty'),[]);
  await table('exact',2);assert.equal((await collect('exact',{maxRows:2})).length,2);
});
it('rejects a safety stop and does not turn a caught error into successful completion',async()=>{
  await table('budget',3);
  await assert.rejects(reader.withCursor({target:target('budget'),access:access(),limits:{...limits,maxRows:2},timeoutMs:10000},async c=>{
    await c.read(2);await assert.rejects(c.read(1),/READ_BUDGET/u);
  }),/READ_BUDGET/u);
  await assertSourceClosed();
});
it('enforces real SELECT privilege before calling the consumer',async()=>{
  await table('denied',1,undefined,false);let called=false;
  await assert.rejects(reader.withCursor({target:target('denied'),access:access(),limits,timeoutMs:10000},async()=>{called=true;}));
  assert.equal(called,false);await assertSourceClosed();
});
it('binds database and publication token through the shared guard',async()=>{
  const rel=await table('published',1);
  const token='b'.repeat(64);
  const marker=`dvt:publication:v1;token=${token};schema=${'c'.repeat(64)}`;
  assert.deepEqual(parsePostgresDvtPublicationMarker(marker),{token,schemaDigestSha256:'c'.repeat(64)});
  await admin.query(`COMMENT ON TABLE ${rel} IS '${marker}'`);
  await reader.withCursor({target:{...target('published'),expectedPublicationToken:token},access:access(),limits,timeoutMs:10000},async c=>{assert.equal((await c.read(4)).rows.length,1);});
  let called=false;
  for(const patch of [{expectedPublicationToken:'d'.repeat(64)},{database:'wrong'}]){
    await assert.rejects(reader.withCursor({target:{...target('published'),...patch},access:access(),limits,timeoutMs:10000},async()=>{called=true;}));
  }
  assert.equal(called,false);await assertSourceClosed();
});
it.each(['numeric','timestamp','integer','bigint[]'])('rejects unsupported %s before reading values',async type=>{
  const name=`type_${type.replace(/[^a-z]/g,'')}`;await table(name,0,`v ${type}`);let called=false;
  await assert.rejects(reader.withCursor({target:target(name),access:access(),limits,timeoutMs:10000},async()=>{called=true;}),/UNSUPPORTED_POSTGRES_SCHEMA/u);
  assert.equal(called,false);
});
it('respects RLS for the non-owner non-bypass reader; EOF is relative to its visible rows',async()=>{
  const rel=await table('rls',4);
  await admin.query(`ALTER TABLE ${rel} ENABLE ROW LEVEL SECURITY; CREATE POLICY visible ON ${rel} USING (id%2=0)`);
  const rows=await collect('rls');assert.equal(rows.length,2);
  assert.ok(rows.every(row=>typeof row[0]==='bigint'&&row[0]%2n===0n));
});
it('revocation stops further native pulls and closes the transaction',async()=>{
  await table('revoked',3);let revoked=false;const reads=vi.spyOn(Cursor.prototype,'read');
  const gate=access();gate.checkpoint=async()=>{if(revoked)throw new Error('private policy');};
  await assert.rejects(reader.withCursor({target:target('revoked'),access:gate,limits,timeoutMs:10000},async c=>{
    await c.read(1);revoked=true;await c.read(1);
  }),/ACCESS_REJECTED/u);
  assert.equal(reads.mock.calls.length,1);await assertSourceClosed();
});
it('cooperative abort prevents delivery of another batch',async()=>{
  await table('cancelled',3);const controller=new AbortController();
  await assert.rejects(reader.withCursor({target:target('cancelled'),access:{...access(),signal:controller.signal},limits,timeoutMs:10000},async c=>{
    await c.read(1);controller.abort();await c.read(1);
  }),/ACCESS_REJECTED/u);
  await assertSourceClosed();
});
it('closes on a consumer failure and rejects cursor reuse after closure',async()=>{
  await table('consumer_failure',3);let saved:PostgresDatasetCursor|undefined;
  await assert.rejects(reader.withCursor({target:target('consumer_failure'),access:access(),limits,timeoutMs:10000},async c=>{
    saved=c;await c.read(1);throw new Error('consumer stop');
  }),/consumer stop/u);
  await assert.rejects(saved!.read(1),/CURSOR_CLOSED/u);await assertSourceClosed();
});
it('times out real source execution instead of interpreting it as EOF',async()=>{
  const rel=await table('slow',1);
  await admin.query(`ALTER TABLE ${rel} ENABLE ROW LEVEL SECURITY; CREATE POLICY delay ON ${rel} USING ((SELECT true FROM pg_sleep(5)))`);
  await assert.rejects(collect('slow',{timeoutMs:1500}),/READ_TIMEOUT|CLEANUP_FAILED/u);
  await assertSourceClosed();
},10000);
it('quotes unusual server-bound identifiers without modifying the neighboring table',async()=>{
  await table('quo"tes / ñ',1);await table('untouched',1);
  assert.equal((await collect('quo"tes / ñ')).length,1);
  assert.equal((await collect('untouched')).length,1);
});
it('preserves the real Preview contract after extracting its relation guard',async()=>{
  await table('preview',5);
  const probe=new WorkspaceWarehouseConnectionProbe({credentialResolver:{resolveCredential:async()=>readerUrl},now:()=>new Date()});
  const result=await probe.previewSourceObjectRows({...target('preview'),limit:2});
  assert.equal(result.rows.length,2);assert.equal(result.truncated,true);
  assert.equal(result.navigation,'bounded-first-page');assert.equal(typeof result.rows[0]!.values[0],'string');
});


it.each([7, 50])('governed FIRST %s preserves sample coverage and actual completion reason', async requested => {
  const name = `governed_sample_${requested}`; await table(name, 10);
  const f = await governed(name); const policy: LocalDataAcquisitionPolicyV1 = { kind: 'sample', method: 'first', requestedRows: String(requested) };
  const result = await f.useCase.execute({ ...f.command, policy }, f.context);
  assert.deepEqual(result.generation.coverage, { kind: 'sample' });
  assert.equal(result.generation.rowCount, String(Math.min(10, requested)));
  assert.equal(result.generation.completionReason, requested === 7 ? 'sample-target-reached' : 'source-exhausted');
  await assertSourceClosed();
});
it('governed FULL budget exhaustion preserves the previously published head', async () => {
  await table('governed_budget', 3); const f = await governed('governed_budget');
  const before = await f.useCase.execute(f.command, f.context);
  const limited = new CaptureLocalDatasetUseCase({ ...f.deps, limits: { ...limits, maxRows: 2 } });
  const captureId = createLocalDataCaptureIdV1();
  await assert.rejects(limited.execute({ ...f.command, captureId, expectedHeadGenerationId: before.generation.generationId }, f.context), /READ_BUDGET|CAPTURE_BUDGET/u);
  assert.deepEqual(await store.readHead(f.command.localDatasetId), before.generation);
  assert.equal(await store.readCapture(f.command.localDatasetId, captureId), null);
  await assertSourceClosed();
});
it.each(['abort', 'revoke'])('governed %s after a committed batch leaves only unpublished staging', async kind => {
  const name = `governed_${kind}`; await table(name, 3); const f = await governed(name);
  const controller = new AbortController(); const original = DuckDbGenerationStore.prototype.append;
  vi.spyOn(DuckDbGenerationStore.prototype, 'append').mockImplementation(async function(this: DuckDbGenerationStore, id, rows) {
    await original.call(this, id, rows);
    if (kind === 'abort') controller.abort(); else f.state.grants = null;
  });
  await assert.rejects(f.useCase.execute(f.command, f.context, controller.signal));
  assert.equal(await store.readHead(f.command.localDatasetId), null);
  assert.equal(await store.readCapture(f.command.localDatasetId, f.command.captureId), null);
  await assertSourceClosed();
});
it.each(['failure', 'revoke', 'binding'])('governed post-close %s prevents READY publication', async kind => {
  const name = `governed_close_${kind}`; await table(name, 3); const f = await governed(name);
  const scoped: IRemoteDatasetReader = { async withCursor(input, consume) {
    const result = await reader.withCursor(input, consume);
    await assertSourceClosed();
    if (kind === 'failure') throw new Error('failed close confirmation');
    if (kind === 'revoke') f.state.grants = null;
    if (kind === 'binding') {
      const file = await f.metadata.getFileContent(scope, WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH);
      const catalogFile = JSON.parse(file.content) as { connections: { id: string; credentialRef: string }[] };
      const entry = catalogFile.connections.find(connection => connection.id === f.connection.id); assert(entry);
      entry.credentialRef = 'postgres:changed';
      const saved = await f.metadata.saveFileContent(scope, { path: WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
        content: JSON.stringify(catalogFile), expectedRevision: { kind: 'content_sha256', value: file.contentSha256 } });
      assert.notEqual(saved.kind, 'conflict');
    }
    return result;
  } };
  const useCase = new CaptureLocalDatasetUseCase({ ...f.deps, reader: scoped });
  await assert.rejects(useCase.execute(f.command, f.context));
  assert.equal(await store.readHead(f.command.localDatasetId), null);
  assert.equal(await store.readCapture(f.command.localDatasetId, f.command.captureId), null);
});
it('governed empty FULL is complete and a stale initial-head CAS cannot replace it', async () => {
  await table('governed_empty', 0); const f = await governed('governed_empty');
  const before = await f.useCase.execute(f.command, f.context);
  assert.equal(before.generation.rowCount, '0'); assert.deepEqual(before.generation.coverage, { kind: 'full', eofObserved: true });
  await assert.rejects(f.useCase.execute({ ...f.command, captureId: createLocalDataCaptureIdV1() }, f.context), /HEAD_CONFLICT/u);
  assert.deepEqual(await store.readHead(f.command.localDatasetId), before.generation);
  await assertSourceClosed();
});
