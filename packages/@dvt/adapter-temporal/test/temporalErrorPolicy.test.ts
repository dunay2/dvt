/**
 * @file test/temporalErrorPolicy.test.ts
 *
 * Unit tests for temporalErrorPolicy — isWorkflowNotFound and normalizeTemporalErrorCode.
 *
 * These functions were previously private to TemporalAdapter and tested only
 * indirectly through lookupRunRef. Extracting them to a dedicated module allows
 * direct testing and reuse across all adapter methods.
 */
import { describe, expect, it } from 'vitest';

import { isWorkflowNotFound, normalizeTemporalErrorCode } from '../src/temporalErrorPolicy.js';

// ---------------------------------------------------------------------------
// normalizeTemporalErrorCode
// ---------------------------------------------------------------------------

describe('normalizeTemporalErrorCode', () => {
  it('returns string representation for a finite number', () => {
    expect(normalizeTemporalErrorCode(5)).toBe('5');
  });

  it('returns undefined for non-finite number (Infinity)', () => {
    expect(normalizeTemporalErrorCode(Infinity)).toBeUndefined();
  });

  it('returns undefined for non-finite number (NaN)', () => {
    expect(normalizeTemporalErrorCode(NaN)).toBeUndefined();
  });

  it('normalizes numeric string to its integer representation', () => {
    expect(normalizeTemporalErrorCode('5')).toBe('5');
  });

  it('trims and normalizes numeric string with spaces', () => {
    expect(normalizeTemporalErrorCode(' 5 ')).toBe('5');
  });

  it('uppercases non-numeric string code', () => {
    expect(normalizeTemporalErrorCode('not_found')).toBe('NOT_FOUND');
  });

  it('trims and uppercases non-numeric string code with spaces', () => {
    expect(normalizeTemporalErrorCode(' NOT_FOUND ')).toBe('NOT_FOUND');
  });

  it('returns undefined for empty string', () => {
    expect(normalizeTemporalErrorCode('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(normalizeTemporalErrorCode('   ')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(normalizeTemporalErrorCode(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeTemporalErrorCode(undefined)).toBeUndefined();
  });

  it('returns undefined for object', () => {
    expect(normalizeTemporalErrorCode({})).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isWorkflowNotFound
// ---------------------------------------------------------------------------

describe('isWorkflowNotFound', () => {
  it('returns true for WorkflowNotFoundError by name', () => {
    const err = new Error('Workflow execution not found');
    err.name = 'WorkflowNotFoundError';
    expect(isWorkflowNotFound(err)).toBe(true);
  });

  it('returns true for ServiceError with numeric code 5', () => {
    const err = Object.assign(new Error('not found'), { name: 'ServiceError', code: 5 });
    expect(isWorkflowNotFound(err)).toBe(true);
  });

  it('returns true for ServiceError with string code "5"', () => {
    const err = Object.assign(new Error('not found'), { name: 'ServiceError', code: '5' });
    expect(isWorkflowNotFound(err)).toBe(true);
  });

  it('returns true for ServiceError with code "NOT_FOUND"', () => {
    const err = Object.assign(new Error('not found'), { name: 'ServiceError', code: 'NOT_FOUND' });
    expect(isWorkflowNotFound(err)).toBe(true);
  });

  it('returns true for ServiceError with lowercase code "not_found"', () => {
    const err = Object.assign(new Error('not found'), { name: 'ServiceError', code: 'not_found' });
    expect(isWorkflowNotFound(err)).toBe(true);
  });

  it('returns true for ServiceError with padded numeric string " 5 "', () => {
    const err = Object.assign(new Error('not found'), { name: 'ServiceError', code: ' 5 ' });
    expect(isWorkflowNotFound(err)).toBe(true);
  });

  it('returns true for ServiceError with padded code " NOT_FOUND "', () => {
    const err = Object.assign(new Error('not found'), {
      name: 'ServiceError',
      code: ' NOT_FOUND ',
    });
    expect(isWorkflowNotFound(err)).toBe(true);
  });

  it('returns false for ServiceError with unknown code', () => {
    const err = Object.assign(new Error('service error'), {
      name: 'ServiceError',
      code: 'UNKNOWN_CODE',
    });
    expect(isWorkflowNotFound(err)).toBe(false);
  });

  it('returns false for non-ServiceError even when code is 5', () => {
    const err = Object.assign(new Error('other error'), { name: 'UnexpectedError', code: 5 });
    expect(isWorkflowNotFound(err)).toBe(false);
  });

  it('returns false for non-Error throwable with ServiceError shape', () => {
    expect(isWorkflowNotFound({ name: 'ServiceError', code: 5, message: 'not an Error' })).toBe(
      false
    );
  });

  it('returns false for null', () => {
    expect(isWorkflowNotFound(null)).toBe(false);
  });

  it('returns false for plain string', () => {
    expect(isWorkflowNotFound('WorkflowNotFoundError')).toBe(false);
  });
});
