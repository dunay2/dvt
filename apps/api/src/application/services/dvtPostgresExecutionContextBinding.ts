/**
 * Owned concern: bind admitted DVT Run workloads to one governed PostgreSQL connection.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Resolve the authorized connection reference before dispatch without persisting credentials.
 * @consequence DVT Run reaches Temporal with one exact non-secret PostgreSQL execution context.
 * @version 1.0.0
 */
import {
  DVT_POSTGRES_PLUGIN_CONTEXT_KEY,
  DvtOperationalWorkloadV2Schema,
  KNOWN_STEP_KINDS,
  type ConnectionRef,
  type DvtOperationalWorkloadV2,
  type ExecutionPlan,
} from '@dvt/contracts';

import {
  WarehouseConnectionNotFoundError,
  type IWarehouseConnectionCatalog,
} from '../ports/warehouseSourceImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

export type DvtPostgresExecutionContextBinding =
  | { readonly kind: 'not-required' }
  | {
      readonly kind: 'bound';
      readonly key: typeof DVT_POSTGRES_PLUGIN_CONTEXT_KEY;
      readonly context: {
        readonly connectionRef: ConnectionRef & { readonly provider: 'postgres' };
        readonly credentialRef: string;
      };
    }
  | { readonly kind: 'rejected'; readonly reason: string };

export async function resolveDvtPostgresExecutionContextBinding(input: {
  readonly plan: ExecutionPlan;
  readonly scope: WorkspaceStorageScope;
  readonly catalog: IWarehouseConnectionCatalog;
}): Promise<DvtPostgresExecutionContextBinding> {
  const steps = input.plan.steps.filter(
    (step) => step.kind === KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD
  );
  if (steps.length === 0) return { kind: 'not-required' };

  const workloads: DvtOperationalWorkloadV2[] = [];
  for (const step of steps) {
    const workload = DvtOperationalWorkloadV2Schema.safeParse(step.stepTypeConfig);
    if (!workload.success) {
      return { kind: 'rejected', reason: 'DVT operational Run requires workload schema v2.' };
    }
    workloads.push(workload.data);
  }

  const connectionRef = workloads[0]?.connectionRef;
  if (
    connectionRef === undefined ||
    workloads.some(
      (workload) =>
        workload.connectionRef.connectionId !== connectionRef.connectionId ||
        workload.connectionRef.provider !== connectionRef.provider
    )
  ) {
    return {
      kind: 'rejected',
      reason: 'One DVT operational Run context cannot span multiple connections.',
    };
  }

  try {
    const connection = await input.catalog.getConnection(input.scope, connectionRef.connectionId);
    if (
      connection.id !== connectionRef.connectionId ||
      connection.type !== 'postgres' ||
      connection.credentialRef === undefined
    ) {
      return { kind: 'rejected', reason: 'The DVT Run connection is not executable.' };
    }
    return {
      kind: 'bound',
      key: DVT_POSTGRES_PLUGIN_CONTEXT_KEY,
      context: { connectionRef, credentialRef: connection.credentialRef },
    };
  } catch (error) {
    if (error instanceof WarehouseConnectionNotFoundError) {
      return { kind: 'rejected', reason: 'The DVT Run connection is not in this workspace.' };
    }
    throw error;
  }
}
