import { describe, expect, it } from 'vitest';

import {
  badRequest,
  forbidden,
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

    it('returns missing_tenant_scope when tenantId is absent', () => {
      const result = parseTenantId({});
      expect(result).toEqual({ ok: false, error: 'MISSING_TENANT_SCOPE' });
    });

    it('returns invalid_tenant_id when tenantId is invalid', () => {
      expect(parseTenantId({ tenantId: 123 })).toEqual({
        ok: false,
        error: 'INVALID_TENANT_ID',
      });
      expect(parseTenantId({ tenantId: '   ' })).toEqual({
        ok: false,
        error: 'INVALID_TENANT_ID',
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

  describe('error helpers', () => {
    it('builds badRequest payload', () => {
      expect(badRequest('INVALID_BODY')).toEqual({
        ok: false,
        status: 400,
        body: {
          error: 'BAD_REQUEST',
          code: 'INVALID_BODY',
        },
      });
    });

    it('builds forbidden payload', () => {
      expect(forbidden('MISSING_TENANT_SCOPE')).toEqual({
        ok: false,
        status: 403,
        body: {
          error: 'FORBIDDEN',
          code: 'MISSING_TENANT_SCOPE',
        },
      });
    });
  });
});
