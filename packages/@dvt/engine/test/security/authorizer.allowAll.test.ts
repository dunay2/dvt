/**
 * @file packages/@dvt/engine/test/security/authorizer.allowAll.test.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Verify AllowAllAuthorizer rejects instantiation in production
 * @consequence Prevents insecure authorizer from reaching production deployments
 * @version 1.0.0
 * @date 2026-03-03
 */
import { describe, expect, it } from 'vitest';

import { AllowAllAuthorizer } from '../../src/security/authorizer.js';

describe('AllowAllAuthorizer safety guard', () => {
  it('throws in production by default', () => {
    expect(() => new AllowAllAuthorizer({ runtimeMode: 'production' })).toThrow(
      'ALLOW_ALL_AUTHORIZER_FORBIDDEN_IN_PRODUCTION'
    );
  });

  it('allows explicit unsafe override in production', () => {
    expect(
      () =>
        new AllowAllAuthorizer({
          runtimeMode: 'production',
          allowInsecureInProduction: true,
        })
    ).not.toThrow();
  });
});
