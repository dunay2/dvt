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
  | { readonly kind: 'rejected'; readonly reason: string };

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
    return { kind: 'rejected', reason: 'DVT operational Run requires exactly one workload.' };
  }

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
    if (input.predecessorReader === undefined) {
      return {
        kind: 'rejected',
        reason: 'DVT PostgreSQL publication admission is not configured.',
      };
    }
    const workload = workloads[0];
    if (workload === undefined) {
      return { kind: 'rejected', reason: 'DVT operational Run requires exactly one workload.' };
    }
    const predecessor = await input.predecessorReader.observe({
      credentialRef: connection.credentialRef,
      target: workload.output.target,
      schemaDigestSha256: workload.targetProjection.schemaDigestSha256,
    });
    if (!predecessor.ok) {
      return { kind: 'rejected', reason: renderPredecessorFailure(predecessor.reason) };
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
      return { kind: 'rejected', reason: 'The DVT Run connection is not in this workspace.' };
    }
    throw error;
  }
}

export interface DvtPostgresPublicationPredecessorReader {
  observe(input: {
    readonly credentialRef: string;
    readonly target: DvtOperationalWorkloadV2['output']['target'];
    readonly schemaDigestSha256: string;
  }): Promise<
    | { readonly ok: true; readonly predecessorToken: string | null }
    | {
        readonly ok: false;
        readonly reason: 'credential_unavailable' | 'unmanaged_target' | 'schema_mismatch';
      }
  >;
}

function renderPredecessorFailure(
  reason: 'credential_unavailable' | 'unmanaged_target' | 'schema_mismatch'
): string {
  switch (reason) {
    case 'credential_unavailable':
      return 'The DVT Run connection is not executable.';
    case 'unmanaged_target':
      return 'The DVT Run target is not managed by DVT.';
    case 'schema_mismatch':
      return 'The DVT Run target schema differs from Preview.';
  }
}
