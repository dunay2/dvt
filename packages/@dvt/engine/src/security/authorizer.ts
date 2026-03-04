/**
 * @file packages/@dvt/engine/src/security/authorizer.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Decision — Authorization is abstracted behind a port so the engine does not depend on a specific IAM provider
 * @decision AllowAllAuthorizer can reject instantiation in production mode via explicit constructor options
 * @consequence Tenant access control can evolve without breaking core execution contracts
 * @consequence AllowAllAuthorizer cannot accidentally reach production
 * @version 1.0.0
 * @date 2026-02-21
 */
export interface IAuthorizer {
  assertTenantAccess(tenantId: string): Promise<void>;
}

export interface AllowAllAuthorizerOptions {
  runtimeMode?: 'production' | 'non-production';
  allowInsecureInProduction?: boolean;
}

export class AllowAllAuthorizer implements IAuthorizer {
  constructor(options: AllowAllAuthorizerOptions = {}) {
    const isProduction = options.runtimeMode === 'production';
    const allowUnsafe = options.allowInsecureInProduction === true;
    if (isProduction && !allowUnsafe) {
      throw new Error('ALLOW_ALL_AUTHORIZER_FORBIDDEN_IN_PRODUCTION');
    }
  }

  async assertTenantAccess(_tenantId: string): Promise<void> {
    // MVP: allow.
  }
}
