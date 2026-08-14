/**
 * @file packages/@dvt/adapter-postgres/src/PostgresPlanConnectionResolver.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision PostgreSQL execution resolves the connection identity fixed by the admitted PlanRef and scoped run context.
 * @consequence Runtime cannot substitute a global or cross-scope PostgreSQL destination for a plan-owned connection.
 * @version 1.0.0
 * @ownedConcern Resolve the PostgreSQL connection fixed by an admitted PlanRef.
 */
import type { ConnectionRef, ExecutionPlan, ResolvedRunContext } from '@dvt/contracts';

export interface PostgresPlanConnection {
  readonly connectionRef: ConnectionRef;
  readonly credentialRef: string;
  readonly connectionString: string;
}

export interface IPostgresPlanConnectionResolver {
  resolveConnection(
    step: ExecutionPlan['steps'][number],
    context: ResolvedRunContext
  ): Promise<PostgresPlanConnection>;
}

export class PostgresPlanConnectionRejectedError extends Error {
  public constructor(readonly code: string) {
    super(code);
    this.name = 'PostgresPlanConnectionRejectedError';
  }
}
