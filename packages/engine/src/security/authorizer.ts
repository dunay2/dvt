export interface IAuthorizer {
  assertTenantAccess(tenantId: string): Promise<void>;
}

export class AllowAllAuthorizer implements IAuthorizer {
  async assertTenantAccess(_tenantId: string): Promise<void> {
    // MVP: allow.
  }
}
