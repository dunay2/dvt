/** @ownedConcern Validate the finite staging profile without pretending to exercise the native driver. */
import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import {
  generationColumnSql, internalGenerationRelation, validateGenerationBatch, validateGenerationLimits,
} from '../../src/infrastructure/duckdb/duckDbGenerationProfile.js';

const columns = [
  { ordinal: 0, localType: 'BIGINT', nullable: false },
  { ordinal: 1, localType: 'VARCHAR', nullable: true },
  { ordinal: 2, localType: 'BOOLEAN', nullable: false },
];
describe('bounded generation physical profile', () => {
  it('generates only ordinal column names and known SQL types', () => {
    assert.equal(generationColumnSql(columns), 'c0 BIGINT NOT NULL, c1 VARCHAR, c2 BOOLEAN NOT NULL');
  });
  for (const localType of ['DOUBLE', 'DECIMAL(38,0)', 'VARCHAR); DROP TABLE x;--', 'bigint', 'UNKNOWN']) {
    it(`rejects unadmitted type ${localType}`, () => {
      assert.throws(() => generationColumnSql([{ ordinal: 0, localType, nullable: false }]), /UNSUPPORTED_SCHEMA/);
    });
  }
  for (const bad of [[], [{ ...columns[0]!, ordinal: 1 }], Array.from({ length: 33 }, (_, ordinal) => ({ ...columns[0]!, ordinal }))]) {
    it('rejects invalid width or ordinals', () => { assert.throws(() => generationColumnSql(bad), /UNSUPPORTED_SCHEMA/); });
  }
  it('keeps bigint beyond double precision, nullable cells and well-formed Unicode', () => {
    const input = [[9007199254740993n, 'ñ👋', true], [-9223372036854775808n, null, false]];
    const batch = validateGenerationBatch(columns, input);
    assert.deepEqual(batch.rows, input); assert.equal(batch.logicalBytes, 25);
    input[0]![1] = 'changed'; assert.equal(batch.rows[0]![1], 'ñ👋');
  });
  for (const bad of [[], [[1n]], [[1, 'x', true]], [[(1n << 63n), 'x', false]],
    [[-(1n << 63n) - 1n, 'x', false]], [[null, 'x', true]], [[1n, undefined, true]],
    [[1n, '\ud800', true]], [[1n, '\udc00', true]], [[1n, 'x', 1]], [[1n, 'x', null]],
    Array.from({ length: 1025 }, () => [1n, null, true]), [[1n, 'x'.repeat(1048576), true]]]) {
    it('rejects malformed, inexact, oversize or null-incompatible rows', () => {
      assert.throws(() => validateGenerationBatch(columns, bad), /INVALID_BATCH/);
    });
  }
  it('accepts exactly a bounded batch and counts UTF-8 bytes, not JS string length', () => {
    const batch = validateGenerationBatch(columns, Array.from({ length: 1024 }, () => [1n, 'ñ', true]));
    assert.equal(batch.rows.length, 1024); assert.equal(batch.logicalBytes, 11264);
  });
  for (const key of ['r_a;drop', 'dvt_store.r_a', 'r_' + 'a'.repeat(31), 'r_' + 'g'.repeat(32), null]) {
    it('refuses unsafe persisted relation identifiers', () => { assert.throws(() => internalGenerationRelation(key), /CORRUPT_METADATA/); });
  }
  it('admits only a generated hexadecimal locator', () => {
    assert.equal(internalGenerationRelation('r_' + 'a'.repeat(32)), 'dvt_store.r_' + 'a'.repeat(32));
  });
  for (const maxRows of [0, -1, 1.2, NaN, Infinity, 100001]) {
    it('rejects invalid row budgets', () => { assert.throws(() => validateGenerationLimits({ maxRows, maxLogicalBytes: 100 }), /INVALID_INPUT/); });
  }
  for (const maxLogicalBytes of [0, -1, 1.5, NaN, 16777217]) {
    it('rejects invalid byte budgets', () => { assert.throws(() => validateGenerationLimits({ maxRows: 100, maxLogicalBytes }), /INVALID_INPUT/); });
  }
  it('copies and freezes admitted per-capture limits', () => {
    const input = { maxRows: 2, maxLogicalBytes: 20 }; const limits = validateGenerationLimits(input);
    input.maxRows = 99; assert.equal(limits.maxRows, 2); assert.equal(Object.isFrozen(limits), true);
  });
});
