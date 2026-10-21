/** @ownedConcern Exercise pull state and terminal failures without claiming provider integration. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { FieldDef } from 'pg';
import ts from 'typescript';
import { describe, it } from 'vitest';

import { createPostgresLocalDataBatchCodec } from '../../src/infrastructure/postgres/postgresLocalDataBatchCodec.js';
import { PostgresPullCursor } from '../../src/infrastructure/postgres/PostgresRemoteDatasetCursor.js';

const field: FieldDef = {
  name: 'id',
  dataTypeID: 20,
  tableID: 123,
  columnID: 1,
  dataTypeSize: 8,
  dataTypeModifier: -1,
  format: 'text',
};
const codec = createPostgresLocalDataBatchCodec([
  { ordinal: 0, name: 'id', dataTypeID: 20, nullable: false },
]);
function fixture(
  values = ['1', '2', '3'],
  maxRows = 100
): { cursor: PostgresPullCursor; reads: () => number } {
  let reads = 0;
  let offset = 0;
  const cursor = new PostgresPullCursor({
    codec,
    fields: [field],
    observedAt: '2026-10-17T00:00:00.000Z',
    limits: { maxRows, maxLogicalBytes: 1000 },
    checkpoint: async () => undefined,
    readNative: async (count) => {
      reads++;
      const rows = values.slice(offset, offset + count).map((value) => [value]);
      offset += rows.length;
      return {
        rows,
        result: { command: 'SELECT', rowCount: rows.length, oid: 0, fields: [field], rows },
      };
    },
  });
  return { cursor, reads: () => reads };
}

describe('scoped PostgreSQL pull state', () => {
  it('reports EOF only after a short result, without speculative next reads', async () => {
    const f = fixture();
    assert.deepEqual((await f.cursor.read(2)).rows, [[1n], [2n]]);
    assert.equal(f.reads(), 1);
    assert.equal((await f.cursor.read(2)).endOfSource, true);
    assert.equal((await f.cursor.read(2)).rows.length, 0);
    assert.equal(f.reads(), 2);
    await f.cursor.finish();
  });
  it('does not call a full-sized batch complete merely because a sample target was reached', async () => {
    const f = fixture();
    assert.equal((await f.cursor.read(2)).endOfSource, false);
    await f.cursor.finish();
    assert.equal(f.reads(), 1);
  });
  it('observes EOF at the safety ceiling using one bounded empty sentinel', async () => {
    const f = fixture(['1', '2'], 2);
    assert.equal((await f.cursor.read(2)).endOfSource, false);
    assert.equal((await f.cursor.read(2)).endOfSource, true);
    assert.equal(f.reads(), 2);
  });
  it('never labels a nonempty safety sentinel as EOF, even when the consumer catches it', async () => {
    const f = fixture(['1', '2', '3'], 2);
    await f.cursor.read(2);
    await assert.rejects(f.cursor.read(1), /READ_BUDGET/u);
    await assert.rejects(f.cursor.finish(), /READ_BUDGET/u);
  });
  it.each([0, -1, 1.5, 1025, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid pull size %s before I/O',
    async (n) => {
      const f = fixture();
      await assert.rejects(f.cursor.read(n), /INVALID_INPUT/u);
      assert.equal(f.reads(), 0);
      await assert.rejects(f.cursor.finish(), /INVALID_INPUT/u);
    }
  );
  it('rejects concurrent pulls and poisons the outstanding operation', async () => {
    const f = fixture();
    const one = f.cursor.read(1);
    const two = f.cursor.read(1);
    const results = await Promise.allSettled([one, two]);
    assert.ok(results.every((result) => result.status === 'rejected'));
    await assert.rejects(f.cursor.finish(), /READ_IN_PROGRESS/u);
  });
  it('rejects reuse after the scope has closed', async () => {
    const f = fixture();
    await f.cursor.finish();
    await assert.rejects(f.cursor.read(1), /CURSOR_CLOSED/u);
    assert.equal(f.reads(), 0);
  });
  it('rejects schema/OID drift instead of decoding by name', async () => {
    const c = new PostgresPullCursor({
      codec,
      fields: [field],
      observedAt: '2026-10-17T00:00:00.000Z',
      limits: { maxRows: 10, maxLogicalBytes: 100 },
      checkpoint: async () => undefined,
      readNative: async () => ({
        rows: [['1']],
        result: {
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          rows: [['1']],
          fields: [{ ...field, dataTypeID: 23 }],
        },
      }),
    });
    await assert.rejects(c.read(1), /SCHEMA_CHANGED/u);
    await assert.rejects(c.finish(), /SCHEMA_CHANGED/u);
  });
  it('checks logical byte budget before delivering a batch', async () => {
    const c = new PostgresPullCursor({
      codec,
      fields: [field],
      observedAt: '2026-10-17T00:00:00.000Z',
      limits: { maxRows: 10, maxLogicalBytes: 7 },
      checkpoint: async () => undefined,
      readNative: async () => packet([['1']]),
    });
    await assert.rejects(c.read(1), /READ_BUDGET/u);
    await assert.rejects(c.finish(), /READ_BUDGET/u);
  });
  it('retains malformed provider values as a terminal failure', async () => {
    const f = fixture(['9007199254740993', '1.1']);
    assert.deepEqual((await f.cursor.read(1)).rows, [[9007199254740993n]]);
    await assert.rejects(f.cursor.read(1), /INVALID_POSTGRES_BATCH/u);
    await assert.rejects(f.cursor.finish(), /INVALID_POSTGRES_BATCH/u);
  });
});

/** A complete driver response; safety tests remove metadata intentionally below. */
function packet(
  rows: unknown[][],
  fields: FieldDef[] = [{ ...field }]
): {
  rows: unknown[][];
  result: { command: string; rowCount: number; oid: number; fields: FieldDef[]; rows: unknown[][] };
} {
  return { rows, result: { command: 'SELECT', rowCount: rows.length, oid: 0, fields, rows } };
}
function safetyOptions(): {
  codec: typeof codec;
  fields: FieldDef[];
  observedAt: string;
  limits: { maxRows: number; maxLogicalBytes: number };
  checkpoint: () => Promise<void>;
  readNative: (count: number) => Promise<ReturnType<typeof packet>>;
} {
  return {
    codec,
    fields: [{ ...field }],
    observedAt: '2026-10-17T00:00:00.000Z',
    limits: { maxRows: 10, maxLogicalBytes: 100 },
    checkpoint: async (): Promise<void> => undefined,
    readNative: async (_count: number) => packet([['1']]),
  };
}

describe('cursor cleanup and immutable read boundary', () => {
  it.each([0, 1])('rejects missing metadata even for %s rows; no fabricated EOF', async (count) => {
    const c = new PostgresPullCursor({
      ...safetyOptions(),
      readNative: async () => ({ rows: count ? [['1']] : [] }),
    });
    await assert.rejects(c.read(2), /SCHEMA_CHANGED/u);
    await assert.rejects(c.finish(), /SCHEMA_CHANGED/u);
  });

  it('shares one completion and does not repeat authorization for repeated finish', async () => {
    let checks = 0;
    const c = new PostgresPullCursor({
      ...safetyOptions(),
      checkpoint: async () => {
        checks++;
      },
    });
    const first = c.finish();
    const second = c.finish();
    await Promise.all([first, second]);
    assert.equal(first, second);
    assert.equal(c.finish(), first);
    assert.equal(checks, 1);
    await assert.rejects(c.read(1), /CURSOR_CLOSED/u);
  });

  it('cannot turn a rejected final checkpoint into a later successful close', async () => {
    let checks = 0;
    const denied = new Error('authorization rejected');
    const c = new PostgresPullCursor({
      ...safetyOptions(),
      checkpoint: async () => {
        checks++;
        if (checks === 1) throw denied;
      },
    });
    await assert.rejects(c.finish(), (error) => error === denied);
    await assert.rejects(c.finish(), (error) => error === denied);
    assert.equal(checks, 1);
  });

  it('closes the boundary before invoking a reentrant checkpoint', async () => {
    let cursor: PostgresPullCursor;
    let checks = 0;
    cursor = new PostgresPullCursor({
      ...safetyOptions(),
      checkpoint: async () => {
        checks++;
        await assert.rejects(cursor.read(1), /CURSOR_CLOSED/u);
      },
    });
    await cursor.finish();
    assert.equal(checks, 1);
  });

  it('does not let closing an outstanding read deliver a batch or retry authorization', async () => {
    const c = new PostgresPullCursor(safetyOptions());
    const pending = c.read(1);
    const closing = c.finish();
    const outcomes = await Promise.allSettled([pending, closing]);
    assert.ok(outcomes.every((outcome) => outcome.status === 'rejected'));
    await assert.rejects(c.finish(), /READ_IN_PROGRESS/u);
  });

  it.each(['field', 'array'])(
    'pins expected metadata independently of the borrowed %s',
    async (kind) => {
      const options = safetyOptions();
      options.readNative = async () => packet([['1']], [{ ...field, name: 'changed' }]);
      const c = new PostgresPullCursor(options);
      if (kind === 'field') options.fields[0]!.name = 'changed';
      else options.fields[0] = { ...field, name: 'changed' };
      await assert.rejects(c.read(1), /SCHEMA_CHANGED/u);
      await assert.rejects(c.finish(), /SCHEMA_CHANGED/u);
    }
  );

  it.each(['maxRows', 'maxLogicalBytes'] as const)(
    'does not accept a caller mutation of %s',
    async (key) => {
      const options = safetyOptions();
      options.limits =
        key === 'maxRows'
          ? { maxRows: 1, maxLogicalBytes: 100 }
          : { maxRows: 10, maxLogicalBytes: 8 };
      const c = new PostgresPullCursor(options);
      await c.read(1);
      options.limits[key] = 100;
      await assert.rejects(c.read(1), /READ_BUDGET/u);
      await assert.rejects(c.finish(), /READ_BUDGET/u);
    }
  );

  it('pins the callback rather than dispatching through a mutable options bag', async () => {
    const options = safetyOptions();
    const c = new PostgresPullCursor(options);
    options.readNative = async () => {
      throw new Error('replaced callback');
    };
    assert.deepEqual((await c.read(1)).rows, [[1n]]);
    await c.finish();
  });

  it('keeps adapter dependencies on narrow ports, not application implementations or Preview', () => {
    const source = (file: string): ts.SourceFile =>
      ts.createSourceFile(
        file,
        readFileSync(path.resolve('src', file), 'utf8'),
        ts.ScriptTarget.Latest,
        true
      );
    const imports = (file: string): { specifier: string; bindings: string }[] =>
      source(file)
        .statements.filter(ts.isImportDeclaration)
        .map((statement) => ({
          specifier: (statement.moduleSpecifier as ts.StringLiteral).text,
          bindings: statement.importClause?.getText() ?? '',
        }));
    for (const file of [
      'infrastructure/postgres/PostgresRemoteDatasetReader.ts',
      'infrastructure/duckdb/DuckDbGenerationStore.ts',
    ]) {
      const dependencies = imports(file);
      assert.ok(
        dependencies.every((dep) => !dep.specifier.includes('/application/services/')),
        file
      );
      assert.ok(
        dependencies.some(
          (dep) =>
            dep.specifier.endsWith('/ports/localDataPlane.js') &&
            dep.bindings.includes('ILocalDataOperationAccess')
        ),
        file
      );
      assert.ok(
        dependencies.every((dep) => !dep.bindings.includes('WarehouseSourceDataSampleProbeTarget')),
        file
      );
    }
    assert.ok(
      imports('infrastructure/postgres/PostgresRemoteDatasetCursor.ts').every(
        (dep) => dep.specifier !== 'pg' && dep.specifier !== 'pg-cursor'
      )
    );
    const lease = source('application/services/localDataAuthorizationLease.ts');
    assert.ok(
      lease.statements
        .filter(ts.isClassDeclaration)
        .some(
          (declaration) =>
            declaration.name?.text === 'LocalDataAuthorizationLease' &&
            declaration.heritageClauses?.some(
              (clause) =>
                clause.token === ts.SyntaxKind.ImplementsKeyword &&
                clause.types.some(
                  (type) => type.expression.getText() === 'ILocalDataOperationAccess'
                )
            )
        )
    );
  });
});
