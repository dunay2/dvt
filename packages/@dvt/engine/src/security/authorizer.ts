/**
 * @file packages/@dvt/engine/src/security/authorizer.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Authorization is abstracted behind a port so the engine does not depend on a specific IAM provider
 * @consequence Tenant access control can evolve without breaking core execution contracts
 * @version 1.0.0
 * @date 2026-02-21
 */
export interface IAuthorizer {
  assertTenantAccess(tenantId: string): Promise<void>;
}

export class AllowAllAuthorizer implements IAuthorizer {
  async assertTenantAccess(_tenantId: string): Promise<void> {
    // MVP: allow.
  }
}
