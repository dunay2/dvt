import { describe, expect, it } from 'vitest';

import { HTTP_ERROR_REASON } from '../../../src/entrypoints/http/httpErrorReasonCatalog.js';
import {
  isBodyObject,
  normalizeRunId,
  parseOptionalReason,
  parseTenantId,
} from '../../../src/entrypoints/http/runCommandFieldParsers.js';

describe('runCommandFieldParsers', () => {
  describe('normalizeRunId', () => {
    it('returns normalized runId when valid', () => {
      expect(normalizeRunId(' run-1 ')).toBe('run-1');
    });

    it('returns null for missing or blank runId', () => {
      expect(normalizeRunId(undefined)).toBeNull();
      expect(normalizeRunId('   ')).toBeNull();
    });
  });

  describe('isBodyObject', () => {
    it('accepts only plain object payloads', () => {
      expect(isBodyObject({ tenantId: 'tenant-a' })).toBe(true);
      expect(isBodyObject(null)).toBe(false);
      expect(isBodyObject('text')).toBe(false);
      expect(isBodyObject(['array'])).toBe(false);
    });
  });

  describe('parseTenantId', () => {
    it('parses a valid tenant id', () => {
      const result = parseTenantId({ tenantId: ' tenant-a ' });
      expect(result).toEqual({ ok: true, value: { value: 'tenant-a' } });
    });

    it('returns forbidden issue when tenantId is absent', () => {
      expect(parseTenantId({})).toEqual({
        ok: false,
        issue: {
          type: 'forbidden',
          reason: HTTP_ERROR_REASON.missingTenantScope,
          target: 'tenantId',
        },
      });
    });

    it('returns bad_request issue when tenantId is invalid', () => {
      expect(parseTenantId({ tenantId: 123 })).toEqual({
        ok: false,
        issue: {
          type: 'bad_request',
          reason: HTTP_ERROR_REASON.invalidTenantId,
          target: 'tenantId',
        },
      });

      expect(parseTenantId({ tenantId: '   ' })).toEqual({
        ok: false,
        issue: {
          type: 'bad_request',
          reason: HTTP_ERROR_REASON.invalidTenantId,
          target: 'tenantId',
        },
      });
    });
  });

  describe('parseOptionalReason', () => {
    it('normalizes non-empty reason and ignores invalid values', () => {
      expect(parseOptionalReason(' operator cancel ')).toBe('operator cancel');
      expect(parseOptionalReason('   ')).toBeUndefined();
      expect(parseOptionalReason(42)).toBeUndefined();
      expect(parseOptionalReason(undefined)).toBeUndefined();
    });
  });
});
