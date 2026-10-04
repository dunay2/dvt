/**
 * Owned concern: bind admitted DVT Run workloads to one governed PostgreSQL connection.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Resolve the authorized connection reference before dispatch without persisting credentials.
 * @consequence DVT Run reaches Temporal with one exact non-secret PostgreSQL execution context.
 * @version 1.0.0
 */
import {
  DVT_POSTGRES_PLUGIN_CONTEXT_KEY,
  DvtOperationalRunWorkloadV1Schema,
  KNOWN_STEP_KINDS,
  type ConnectionRef,
  type DvtOperationalRunWorkloadV1,
  type DvtOperationalRejectionCause,
  type ExecutionPlan,
  type PlanRef,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

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
        readonly publicationToken: string;
        readonly expectedPredecessorToken: string;
      };
    }
  | { readonly kind: 'rejected'; readonly cause: DvtOperationalRejectionCause };

export async function resolveDvtPostgresExecutionContextBinding(input: {
  readonly plan: ExecutionPlan;
  readonly planRef: PlanRef;
  readonly runId: string;
  readonly scope: WorkspaceStorageScope;
  readonly catalog: IWarehouseConnectionCatalog;
  readonly predecessorReader?: DvtPostgresPublicationPredecessorReader;
}): Promise<DvtPostgresExecutionContextBinding> {
  const steps = input.plan.steps.filter(
    (step) => step.kind === KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD
  );
  if (steps.length === 0) return { kind: 'not-required' };
  if (steps.length !== 1) {
    return { kind: 'rejected', cause: 'dvt_run_workload_count_invalid' };
  }

  const parsed = DvtOperationalRunWorkloadV1Schema.safeParse(steps[0]!.stepTypeConfig);
  if (!parsed.success) {
    return { kind: 'rejected', cause: 'dvt_run_intent_required' };
  }
  const workload = parsed.data;
  const { connectionRef } = workload;

  try {
    const connection = await input.catalog.getConnection(input.scope, connectionRef.connectionId);
    if (
      connection.id !== connectionRef.connectionId ||
      connection.type !== 'postgres' ||
      connection.credentialRef === undefined
    ) {
      return { kind: 'rejected', cause: 'dvt_run_connection_unavailable' };
    }
    if (input.predecessorReader === undefined) {
      return {
        kind: 'rejected',
        cause: 'dvt_run_publication_unavailable',
      };
    }
    const predecessor = await input.predecessorReader.observe({
      credentialRef: connection.credentialRef,
      target: workload.output.target,
      schemaDigestSha256: workload.targetProjection.schemaDigestSha256,
    });
    if (!predecessor.ok) {
      return { kind: 'rejected', cause: PREDECESSOR_REJECTION_CAUSES[predecessor.reason] };
    }
    const workloadSha256 = sha256HexUtf8(jcsCanonicalize(workload));
    const publicationToken = sha256HexUtf8(
      jcsCanonicalize({
        schemaVersion: 'dvt-postgres-publication-token.v1',
        plan: {
          planId: input.planRef.planId,
          planVersion: input.planRef.planVersion,
          sha256: input.planRef.sha256,
        },
        workloadSha256,
        runId: input.runId,
        target: workload.output.target,
      })
    );
    return {
      kind: 'bound',
      key: DVT_POSTGRES_PLUGIN_CONTEXT_KEY,
      context: {
        connectionRef,
        credentialRef: connection.credentialRef,
        publicationToken,
        expectedPredecessorToken: predecessor.predecessorToken ?? 'absent',
      },
    };
  } catch (error) {
    if (error instanceof WarehouseConnectionNotFoundError) {
      return { kind: 'rejected', cause: 'dvt_run_connection_not_found' };
    }
    throw error;
  }
}

export interface DvtPostgresPublicationPredecessorReader {
  observe(input: {
    readonly credentialRef: string;
    readonly target: DvtOperationalRunWorkloadV1['output']['target'];
    readonly schemaDigestSha256: string;
  }): Promise<
    | { readonly ok: true; readonly predecessorToken: string | null }
    | {
        readonly ok: false;
        readonly reason: 'credential_unavailable' | 'unmanaged_target' | 'schema_mismatch';
      }
  >;
}

const PREDECESSOR_REJECTION_CAUSES = {
  credential_unavailable: 'dvt_run_connection_unavailable',
  unmanaged_target: 'dvt_run_target_unmanaged',
  schema_mismatch: 'dvt_run_schema_mismatch',
} as const satisfies Record<string, DvtOperationalRejectionCause>;
