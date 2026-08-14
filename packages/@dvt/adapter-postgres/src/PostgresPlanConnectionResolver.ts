/**
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
