import { describe, expect, it } from 'vitest';

import {
  LINEAGE_ERROR_CODE,
  LINEAGE_ERROR_MESSAGE_KEY,
  LINEAGE_ERROR_REASON_CODE,
} from '../../src/lineage/errorContract.js';
import { CompiledCodeNotFoundError, CompiledCodeReaderError } from '../../src/lineage/errors.js';
import {
  sanitizeLineageErrorForPersistence,
  toLineageErrorLike,
} from '../../src/lineage/errorSupport.js';

describe('lineage error contract', () => {
  it('exposes stable code, messageKey, and messageParams on typed lineage errors', () => {
    const error = new CompiledCodeNotFoundError({ storageUri: 'memory://compiled/missing.sql' });

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(LINEAGE_ERROR_CODE.COMPILED_CODE_NOT_FOUND);
    expect(error.messageKey).toBe(LINEAGE_ERROR_MESSAGE_KEY.COMPILED_CODE_NOT_FOUND);
    expect(error.messageParams).toEqual({ storageUri: 'memory://compiled/missing.sql' });
    expect(error.message).toBe('Compiled code not found for URI: memory://compiled/missing.sql');
  });

  it('preserves structured metadata when projecting errors for logs', () => {
    const error = new CompiledCodeReaderError({
      reason: 'token=super-secret',
      reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_READ_FAILED,
      sourceUri: 's3://bucket/path.sql',
    });

    expect(toLineageErrorLike(error)).toEqual({
      code: LINEAGE_ERROR_CODE.COMPILED_CODE_READER_ERROR,
      message: 'Compiled code read failed for s3://bucket/path.sql: token=[REDACTED]',
      messageKey: LINEAGE_ERROR_MESSAGE_KEY.COMPILED_CODE_READER_ERROR,
      messageParams: {
        reason: 'token=[REDACTED]',
        reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_READ_FAILED,
        sourceUri: 's3://bucket/path.sql',
      },
      name: 'CompiledCodeReaderError',
    });
  });

  it('serializes plain objects instead of persisting default object stringification', () => {
    expect(
      sanitizeLineageErrorForPersistence({
        detail: 'failed to fetch',
        token: 'super-secret',
      })
    ).toBe('{"detail":"failed to fetch","token":"[REDACTED]"}');
  });

  it('returns a stable message for circular objects', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(sanitizeLineageErrorForPersistence(circular)).toBe('[object with circular reference]');
  });
});
