/**
 * Owned concern: expose normalized principal grants without leaking their
 * embedded JSON persistence shape into application consumers.
 */
import type { PrincipalRef } from '../../domain/auth/types.js';

export type EnvironmentGrant = Readonly<{
  environmentId: string;
  allowedActions: readonly string[];
}>;

export type ProjectGrant = Readonly<{
  projectId: string;
  allowedActions: readonly string[];
  environmentAccess: readonly EnvironmentGrant[];
}>;

export type TenantGrant = Readonly<{
  tenantId: string;
  allowedActions: readonly string[];
  projectAccess: readonly ProjectGrant[];
}>;

export type PrincipalGrantSnapshot = Readonly<{
  principal: PrincipalRef;
  suspended: boolean;
  tenantAccess: readonly TenantGrant[];
}>;

export interface IPrincipalGrantRepository {
  migrate(): Promise<void>;
  load(
    principal: PrincipalRef,
    options?: Readonly<{ forUpdate?: boolean }>
  ): Promise<PrincipalGrantSnapshot | null>;
  save(snapshot: PrincipalGrantSnapshot): Promise<void>;
}
