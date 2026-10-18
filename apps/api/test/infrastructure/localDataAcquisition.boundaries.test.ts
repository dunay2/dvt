/** @ownedConcern Protect LOCAL batch semantics and reentrant cursor admission across adapter boundaries. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import { describe, it } from 'vitest';

import { generationColumnSql, validateGenerationBatch, validateGenerationLimits } from '../../src/infrastructure/duckdb/duckDbGenerationProfile.js';
import { PostgresPullCursor } from '../../src/infrastructure/postgres/PostgresRemoteDatasetCursor.js';
import { createPostgresLocalDataBatchCodec } from '../../src/infrastructure/postgres/postgresLocalDataBatchCodec.js';

const field = { name: 'id', tableID: 123, columnID: 1, dataTypeID: 20,
  dataTypeModifier: -1, format: 'text' };
const codec = createPostgresLocalDataBatchCodec([{ ordinal: 0, name: 'id', dataTypeID: 20, nullable: false }]);
const packet = (rows: unknown[][]) => ({ rows, result: { fields: [field] } });
function safetyOptions() {
  return { codec, fields: [field], observedAt: '2026-10-18T00:00:00.000Z',
    limits: { maxRows: 10, maxLogicalBytes: 100 },
    checkpoint: async (): Promise<void> => undefined,
    readNative: async () => packet([['1']]) };
}


describe('pull admission before reentrant callbacks', () => {
  it('rejects a checkpoint that reenters read before the outer operation suspends', async () => {
    let cursor: PostgresPullCursor;
    let nested: Promise<unknown> | undefined;
    let entered = false;
    let reads = 0;
    cursor = new PostgresPullCursor({ ...safetyOptions(),
      checkpoint: async () => {
        if (!entered) {
          entered = true;
          nested = cursor.read(1);
          void nested.catch(() => undefined);
        }
      },
      readNative: async () => { reads++; return packet([['1']]); },
    });
    const outer = await Promise.allSettled([cursor.read(1)]);
    const inner = await Promise.allSettled([nested!]);
    assert.equal(outer[0]!.status, 'rejected');
    assert.equal(inner[0]!.status, 'rejected');
    assert.equal(reads, 0);
    await assert.rejects(cursor.finish(), /READ_IN_PROGRESS/u);
  });

  it('cannot deliver rows when the initial checkpoint reenters finish', async () => {
    let cursor: PostgresPullCursor;
    let closing: Promise<void> | undefined;
    let entered = false;
    let reads = 0;
    cursor = new PostgresPullCursor({ ...safetyOptions(),
      checkpoint: async () => {
        if (!entered) {
          entered = true;
          closing = cursor.finish();
          void closing.catch(() => undefined);
        }
      },
      readNative: async () => { reads++; return packet([['1']]); },
    });
    const results = await Promise.allSettled([cursor.read(1)]);
    const closed = await Promise.allSettled([closing!]);
    assert.equal(results[0]!.status, 'rejected');
    assert.equal(closed[0]!.status, 'rejected');
    assert.equal(reads, 0);
    await assert.rejects(cursor.finish(), /READ_IN_PROGRESS/u);
  });

  it('keeps row semantics in domain and native resource lifecycle out of the Reader', () => {
    const imports = (file: string) => ts.createSourceFile(file,
      readFileSync(path.resolve('src', file), 'utf8'), ts.ScriptTarget.Latest, true)
      .statements.filter(ts.isImportDeclaration)
      .map(statement => (statement.moduleSpecifier as ts.StringLiteral).text);
    for (const file of ['PostgresRemoteDatasetReader.ts', 'PostgresRemoteDatasetCursor.ts',
      'postgresLocalDataBatchCodec.ts']) {
      assert.ok(imports(`infrastructure/postgres/${file}`).every(dep => !dep.includes('/duckdb/')), file);
    }
    assert.ok(imports('infrastructure/postgres/PostgresRemoteDatasetReader.ts')
      .every(dep => dep !== 'pg' && dep !== 'pg-cursor'));
    assert.ok(imports('domain/localDataBatch.ts')
      .every(dep => !dep.includes('infrastructure') && !dep.includes('application') &&
        !dep.includes('duckdb') && dep !== 'pg' && dep !== 'pg-cursor'));
  });
});


describe('malformed profile boundary', () => {
  const malformed = [new Array(1), [null], [undefined], [false], [1], ['BIGINT']];
  for (const input of malformed) {
    it(`rejects invalid column descriptors with a typed schema error: ${String(input)}`, () => {
      const bad = input as unknown as Parameters<typeof generationColumnSql>[0];
      assert.throws(() => generationColumnSql(bad), /UNSUPPORTED_SCHEMA/u);
      assert.throws(() => validateGenerationBatch(bad, [[1n]]), /UNSUPPORTED_SCHEMA/u);
    });
  }
  for (const input of [null, undefined]) {
    it(`rejects missing budget ${String(input)} with the existing typed error`, () => {
      assert.throws(() => validateGenerationLimits(input as unknown as Parameters<typeof validateGenerationLimits>[0]),
        /INVALID_INPUT/u);
    });
  }
});
