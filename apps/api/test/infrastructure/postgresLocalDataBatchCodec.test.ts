/** @ownedConcern Prove positional, exact and bounded conversion; no claim of a live PostgreSQL reader. */
import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import {
  createPostgresLocalDataBatchCodec,
  type PostgresLocalDataField,
} from '../../src/infrastructure/postgres/postgresLocalDataBatchCodec.js';

function field(dataTypeID = 20, nullable = false, ordinal = 0): PostgresLocalDataField {
  return { ordinal, name: 'value', dataTypeID, nullable };
}
function codec(dataTypeID = 20, nullable = false) {
  return createPostgresLocalDataBatchCodec([field(dataTypeID, nullable)]);
}

describe('PostgreSQL LOCAL primitive text batch codec', () => {
  for (const [raw, expected] of [
    ['0', 0n], ['-1', -1n], ['1', 1n], ['9007199254740993', 9007199254740993n],
    ['9223372036854775807', (1n << 63n) - 1n], ['-9223372036854775808', -(1n << 63n)],
  ] as const) {
    it(`decodes exact signed bigint ${raw}`, () => {
      const actual = codec().decode([[raw]]);
      assert.deepEqual(actual.rows, [[expected]]);
      assert.equal(actual.logicalBytes, 8);
      assert.equal(actual.decodedTextBytes, Buffer.byteLength(raw));
    });
  }
  for (const bad of ['9223372036854775808', '-9223372036854775809', '1e3', '1.0', ' 1', '1 ',
    '+1', '01', '-0', '', 'NaN', 'Infinity', '9'.repeat(1000), 9007199254740992, 1n, true, undefined, null]) {
    it(`rejects malformed or already coerced int8 ${String(bad).slice(0, 30)}`, () => {
      assert.throws(() => codec().decode([[bad]]), /INVALID_POSTGRES_BATCH/u);
    });
  }
  for (const [raw, expected] of [['t', true], ['f', false]] as const) {
    it(`decodes PostgreSQL bool ${raw}`, () => assert.deepEqual(codec(16).decode([[raw]]).rows, [[expected]]));
  }
  for (const bad of ['true', 'false', 'TRUE', 'FALSE', '0', '1', '', false, true, 0, 1]) {
    it(`rejects noncanonical raw bool ${String(bad)} (${typeof bad})`, () => {
      assert.throws(() => codec(16).decode([[bad]]), /INVALID_POSTGRES_BATCH/u);
    });
  }
  for (const oid of [25, 1043]) {
    it(`preserves spaces, combining forms, astral Unicode and empty text for OID ${oid}`, () => {
      const input = [['  ñ 👋  '], ['e\u0301'], ['é'], [''], ['0'], ['false']];
      const result = codec(oid).decode(input);
      assert.deepEqual(result.rows, input);
      assert.equal(result.decodedTextBytes, input.reduce((n, row) => n + Buffer.byteLength(row[0]!), 0));
      assert.equal(result.logicalBytes, result.decodedTextBytes);
    });
    for (const bad of ['\ud800', '\udc00', 'a\0b', {}, new Date(0), Buffer.from('text')]) {
      it(`rejects invalid text representation for OID ${oid}: ${String(bad)}`, () => {
        assert.throws(() => codec(oid).decode([[bad]]), /INVALID_POSTGRES_BATCH/u);
      });
    }
  }
  for (const oid of [20, 16, 25, 1043]) {
    it(`preserves nullable OID ${oid} without conflating null and empty`, () => {
      assert.deepEqual(codec(oid, true).decode([[null]]), { rows: [[null]], logicalBytes: 1, decodedTextBytes: 0 });
      assert.throws(() => codec(oid, false).decode([[null]]), /INVALID_POSTGRES_BATCH/u);
    });
  }
  for (const oid of [0, 17, 21, 23, 700, 701, 1700, 1082, 1114, 1184, 114, 3802, 2950, 1007, 999999, NaN]) {
    it(`refuses unproven PostgreSQL OID ${oid} rather than coercing it`, () => {
      assert.throws(() => codec(oid), /UNSUPPORTED_POSTGRES_SCHEMA/u);
    });
  }
  it('preserves duplicate logical names and column order', () => {
    const value = createPostgresLocalDataBatchCodec([field(), field(25, true, 1), field(16, false, 2)]);
    assert.deepEqual(value.schema.columns.map(c => c.name), ['value', 'value', 'value']);
    assert.deepEqual(value.schema.columns.map(c => c.ordinal), [0, 1, 2]);
    assert.deepEqual(value.schema.columns.map(c => c.localType), ['BIGINT', 'VARCHAR', 'BOOLEAN']);
    assert.deepEqual(value.decode([['9007199254740993', 't', 'f']]).rows, [[9007199254740993n, 't', false]]);
  });
  for (const fields of [[], [field(20, false, 1)], [field(), field()], new Array(2),
    [field(), ...Array.from({ length: 32 }, (_, i) => field(20, false, i + 1))]]) {
    it(`rejects missing/sparse/disordered/oversized metadata of length ${fields.length}`, () => {
      assert.throws(() => createPostgresLocalDataBatchCodec(fields), /UNSUPPORTED_POSTGRES_SCHEMA/u);
    });
  }
  for (const name of ['', '\0', 'x'.repeat(257), '\ud800']) {
    it(`rejects invalid field name length ${name.length}`, () => {
      assert.throws(() => createPostgresLocalDataBatchCodec([{ ...field(), name }]), /UNSUPPORTED_POSTGRES_SCHEMA/u);
    });
  }
  it('freezes metadata and detaches it from caller mutation', () => {
    const input = [{ ...field() }]; const result = createPostgresLocalDataBatchCodec(input);
    input[0]!.dataTypeID = 25; input[0]!.name = 'changed';
    assert.equal(result.schema.columns[0]!.name, 'value');
    assert.deepEqual(result.decode([['2']]).rows, [[2n]]);
    assert.ok(Object.isFrozen(result.schema));
    assert.ok(Object.isFrozen(result.schema.columns));
    assert.ok(Object.isFrozen(result.schema.columns[0]));
  });
  it('copies rows and reports fresh counters for each batch', () => {
    const value = codec(); const raw = [['2']]; const a = value.decode(raw); raw[0]![0] = '3';
    a.rows[0]![0] = 999n;
    assert.deepEqual(value.decode(raw), { rows: [[3n]], logicalBytes: 8, decodedTextBytes: 1 });
  });
  for (const input of [[], [[]], [['1', '2']], [new Array(1)], new Array(1), Array.from({ length: 1025 }, () => ['1'])]) {
    it(`rejects malformed/sparse batch of length ${input.length}`, () => {
      assert.throws(() => codec().decode(input), /INVALID_POSTGRES_BATCH/u);
    });
  }
  it('admits the exact 1024-row and 1 MiB boundaries', () => {
    assert.equal(codec().decode(Array.from({ length: 1024 }, () => ['1'])).rows.length, 1024);
    assert.equal(codec(25).decode([['a'.repeat(1048576)]]).logicalBytes, 1048576);
  });
  it('rejects UTF-8 byte excess even when JavaScript character count is below the budget', () => {
    assert.throws(() => codec(25).decode([['ñ'.repeat(524289)]]), /INVALID_POSTGRES_BATCH/u);
    assert.throws(() => codec(25).decode([['a'.repeat(1048576)], ['b']]), /INVALID_POSTGRES_BATCH/u);
  });
  it('does not include rejected values in error messages', () => {
    assert.throws(() => codec().decode([['secret-value-incorrect']]), error => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'Local PostgreSQL conversion rejected: INVALID_POSTGRES_BATCH');
      return true;
    });
  });
});
