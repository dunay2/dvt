/** @ownedConcern Prove asynchronous cursor boundaries and responsibility separation without native I/O. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import { describe, it } from 'vitest';

import { createPostgresLocalDataBatchCodec } from '../../src/infrastructure/postgres/postgresLocalDataBatchCodec.js';
import { PostgresPullCursor } from '../../src/infrastructure/postgres/PostgresRemoteDatasetCursor.js';

const field = {
  name: 'id',
  dataTypeID: 20,
  tableID: 123,
  columnID: 1,
  dataTypeModifier: -1,
  format: 'text',
};
const codec = createPostgresLocalDataBatchCodec([
  { ordinal: 0, name: 'id', dataTypeID: 20, nullable: false },
]);
const options = {
  codec,
  fields: [field],
  observedAt: '2026-10-18T00:00:00.000Z',
  limits: { maxRows: 10, maxLogicalBytes: 100 },
};

describe('native cursor borrowing and reentrancy', () => {
  it('installs the active read before calling a reentrant checkpoint', async () => {
    let cursor: PostgresPullCursor;
    let entered = false;
    let nested: Promise<unknown> | undefined;
    let nativeReads = 0;
    cursor = new PostgresPullCursor({
      ...options,
      checkpoint: async () => {
        if (entered) return;
        entered = true;
        nested = cursor.read(1);
        void nested.catch(() => undefined);
      },
      readNative: async () => {
        nativeReads++;
        return { rows: [['1']], result: { fields: [{ ...field }] } };
      },
    });
    const first = cursor.read(1);
    await Promise.resolve();
    assert.ok(nested, 'checkpoint must actually exercise reentrancy');
    const results = await Promise.allSettled([first, nested]);
    assert.ok(results.every((result) => result.status === 'rejected'));
    assert.equal(nativeReads, 0);
    await assert.rejects(cursor.finish(), /READ_IN_PROGRESS/u);
  });

  it.each(['cell', 'rows', 'field'] as const)(
    'pins returned %s before asynchronous reauthorization',
    async (kind) => {
      const packet = { rows: [['1']], result: { fields: [{ ...field }] } };
      let delivered = false;
      let changed = false;
      const cursor = new PostgresPullCursor({
        ...options,
        checkpoint: async () => {
          if (!delivered || changed) return;
          changed = true;
          if (kind === 'cell') packet.rows[0]![0] = '999';
          if (kind === 'rows') packet.rows.length = 0;
          if (kind === 'field') packet.result.fields[0]!.name = 'changed';
        },
        readNative: async () => {
          delivered = true;
          return packet;
        },
      });
      const batch = await cursor.read(2);
      assert.equal(changed, true);
      assert.deepEqual(batch.rows, [[1n]]);
      assert.equal(batch.logicalBytes, 8);
      assert.equal(batch.endOfSource, true);
      await cursor.finish();
    }
  );

  it('rejects invalid received metadata before a later callback can repair it', async () => {
    const packet = { rows: [['1']], result: { fields: [{ ...field, name: 'wrong' }] } };
    let delivered = false;
    const cursor = new PostgresPullCursor({
      ...options,
      checkpoint: async () => {
        if (delivered) packet.result.fields[0]!.name = 'id';
      },
      readNative: async () => {
        delivered = true;
        return packet;
      },
    });
    await assert.rejects(cursor.read(2), /SCHEMA_CHANGED/u);
    await assert.rejects(cursor.finish(), /SCHEMA_CHANGED/u);
  });

  it('never delivers decoded values after post-read authorization is denied', async () => {
    let delivered = false;
    const denied = new Error('revoked after read');
    const cursor = new PostgresPullCursor({
      ...options,
      checkpoint: async () => {
        if (delivered) throw denied;
      },
      readNative: async () => {
        delivered = true;
        return { rows: [['1']], result: { fields: [field] } };
      },
    });
    await assert.rejects(cursor.read(2), (error) => error === denied);
    await assert.rejects(cursor.finish(), (error) => error === denied);
  });
});

it('keeps capture policy, access and provider preflight in their own modules', () => {
  const imports = (file: string): string[] => {
    const source = ts.createSourceFile(
      file,
      readFileSync(path.resolve('src', file), 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    return source.statements
      .filter(ts.isImportDeclaration)
      .map((statement) => (statement.moduleSpecifier as ts.StringLiteral).text);
  };
  const service = imports('application/services/captureLocalDatasetUseCase.ts');
  assert.ok(service.includes('./localDataCapturePolicy.js'));
  assert.ok(service.includes('./localDataCaptureAccess.js'));
  assert.ok(service.every((name) => !name.includes('infrastructure')));
  const policy = imports('application/services/localDataCapturePolicy.ts');
  assert.ok(
    policy.every((name) => !name.includes('infrastructure') && !name.includes('Authorization'))
  );
  const access = imports('application/services/localDataCaptureAccess.ts');
  assert.ok(access.includes('./localDataAuthorizationLease.js'));
  assert.ok(access.every((name) => !name.includes('infrastructure')));
  const reader = imports('infrastructure/postgres/PostgresRemoteDatasetReader.ts');
  assert.ok(reader.includes('./postgresDatasetSnapshot.js'));
});
