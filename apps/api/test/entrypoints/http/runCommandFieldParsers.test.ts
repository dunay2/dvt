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

    it('supports custom open-set tenant parse error codes', () => {
      const customCodes = {
        MISSING_TENANT_SCOPE: 'TENANT_SCOPE_MISSING_CUSTOM',
        INVALID_TENANT_ID: 'TENANT_ID_BAD_CUSTOM',
      } as const;

      expect(parseTenantId({}, customCodes)).toEqual({
        ok: false,
        error: 'TENANT_SCOPE_MISSING_CUSTOM',
      });
      expect(parseTenantId({ tenantId: '   ' }, customCodes)).toEqual({
        ok: false,
        error: 'TENANT_ID_BAD_CUSTOM',
      });
      expect(parseTenantId({ tenantId: 123 }, customCodes)).toEqual({
        ok: false,
        error: 'TENANT_ID_BAD_CUSTOM',
      });
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

    it('supports custom tenant parse error codes', () => {
      const customCodes = {
        MISSING_TENANT_SCOPE: 'TENANT_SCOPE_MISSING_CUSTOM',
        INVALID_TENANT_ID: 'TENANT_ID_INVALID_CUSTOM',
      } as const;

      expect(parseTenantId({}, customCodes)).toEqual({
        ok: false,
        error: 'TENANT_SCOPE_MISSING_CUSTOM',
      });
      expect(parseTenantId({ tenantId: 123 }, customCodes)).toEqual({
        ok: false,
        error: 'TENANT_ID_INVALID_CUSTOM',
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

    it('supports open parse-code sets for shared parser plumbing', () => {
      expect(badRequest('CUSTOM_BAD_REQUEST_CODE')).toEqual({
        ok: false,
        status: 400,
        body: {
          error: 'BAD_REQUEST',
          code: 'CUSTOM_BAD_REQUEST_CODE',
        },
      });
      expect(forbidden('CUSTOM_FORBIDDEN_CODE')).toEqual({
        ok: false,
        status: 403,
        body: {
          error: 'FORBIDDEN',
          code: 'CUSTOM_FORBIDDEN_CODE',
        },
      });
    });
  });
});
