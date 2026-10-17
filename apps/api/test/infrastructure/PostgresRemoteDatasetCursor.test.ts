/** @ownedConcern Exercise pull state and terminal failures without claiming provider integration. */
import assert from 'node:assert/strict';

import type { FieldDef } from 'pg';
import { describe, it } from 'vitest';

import { createPostgresLocalDataBatchCodec } from '../../src/infrastructure/postgres/postgresLocalDataBatchCodec.js';
import { PostgresPullCursor } from '../../src/infrastructure/postgres/PostgresRemoteDatasetCursor.js';

const field: FieldDef = { name: 'id', dataTypeID: 20, tableID: 123, columnID: 1,
  dataTypeSize: 8, dataTypeModifier: -1, format: 'text' };
const codec = createPostgresLocalDataBatchCodec([{ ordinal: 0, name: 'id', dataTypeID: 20, nullable: false }]);
function fixture(values = ['1','2','3'], maxRows = 100) {
  let reads = 0; let offset = 0;
  const cursor = new PostgresPullCursor({ codec, fields: [field], observedAt: '2026-10-17T00:00:00.000Z',
    limits: { maxRows, maxLogicalBytes: 1000 }, checkpoint: async () => undefined,
    readNative: async (count) => {
      reads++; const rows = values.slice(offset, offset + count).map(value => [value]); offset += rows.length;
      return { rows, result: { command: 'SELECT', rowCount: rows.length, oid: 0, fields: [field], rows } };
    },
  });
  return { cursor, reads: () => reads };
}

describe('scoped PostgreSQL pull state', () => {
  it('reports EOF only after a short result, without speculative next reads', async () => {
    const f = fixture();
    assert.deepEqual((await f.cursor.read(2)).rows, [[1n],[2n]]);
    assert.equal(f.reads(),1);
    assert.equal((await f.cursor.read(2)).endOfSource,true);
    assert.equal((await f.cursor.read(2)).rows.length,0);
    assert.equal(f.reads(),2);
    await f.cursor.finish();
  });
  it('does not call a full-sized batch complete merely because a sample target was reached', async () => {
    const f = fixture();
    assert.equal((await f.cursor.read(2)).endOfSource,false);
    await f.cursor.finish();
    assert.equal(f.reads(),1);
  });
  it('observes EOF at the safety ceiling using one bounded empty sentinel', async () => {
    const f = fixture(['1','2'],2);
    assert.equal((await f.cursor.read(2)).endOfSource,false);
    assert.equal((await f.cursor.read(2)).endOfSource,true);
    assert.equal(f.reads(),2);
  });
  it('never labels a nonempty safety sentinel as EOF, even when the consumer catches it', async () => {
    const f = fixture(['1','2','3'],2);
    await f.cursor.read(2);
    await assert.rejects(f.cursor.read(1),/READ_BUDGET/u);
    await assert.rejects(f.cursor.finish(),/READ_BUDGET/u);
  });
  it.each([0,-1,1.5,1025,Number.NaN,Number.POSITIVE_INFINITY])('rejects invalid pull size %s before I/O', async (n) => {
    const f = fixture();
    await assert.rejects(f.cursor.read(n),/INVALID_INPUT/u);
    assert.equal(f.reads(),0);
    await assert.rejects(f.cursor.finish(),/INVALID_INPUT/u);
  });
  it('rejects concurrent pulls and poisons the outstanding operation', async () => {
    const f = fixture();
    const one = f.cursor.read(1);
    const two = f.cursor.read(1);
    const results = await Promise.allSettled([one,two]);
    assert.ok(results.every(result => result.status === 'rejected'));
    await assert.rejects(f.cursor.finish(),/READ_IN_PROGRESS/u);
  });
  it('rejects reuse after the scope has closed', async () => {
    const f = fixture(); await f.cursor.finish();
    await assert.rejects(f.cursor.read(1),/CURSOR_CLOSED/u);
    assert.equal(f.reads(),0);
  });
  it('rejects schema/OID drift instead of decoding by name', async () => {
    const c = new PostgresPullCursor({ codec, fields:[field], observedAt:'2026-10-17T00:00:00.000Z',
      limits:{maxRows:10,maxLogicalBytes:100},checkpoint:async()=>undefined,
      readNative:async()=>({rows:[['1']],result:{command:'SELECT',rowCount:1,oid:0,rows:[['1']],fields:[{...field,dataTypeID:23}]}}),
    });
    await assert.rejects(c.read(1),/SCHEMA_CHANGED/u);
    await assert.rejects(c.finish(),/SCHEMA_CHANGED/u);
  });
  it('checks logical byte budget before delivering a batch', async () => {
    const c = new PostgresPullCursor({ codec, fields:[field], observedAt:'2026-10-17T00:00:00.000Z',
      limits:{maxRows:10,maxLogicalBytes:7},checkpoint:async()=>undefined,readNative:async()=>({rows:[['1']]}),
    });
    await assert.rejects(c.read(1),/READ_BUDGET/u);
    await assert.rejects(c.finish(),/READ_BUDGET/u);
  });
  it('retains malformed provider values as a terminal failure', async () => {
    const f = fixture(['9007199254740993','1.1']);
    assert.deepEqual((await f.cursor.read(1)).rows,[[9007199254740993n]]);
    await assert.rejects(f.cursor.read(1),/INVALID_POSTGRES_BATCH/u);
    await assert.rejects(f.cursor.finish(),/INVALID_POSTGRES_BATCH/u);
  });
});
