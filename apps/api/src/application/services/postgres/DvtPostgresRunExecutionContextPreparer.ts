/**
 * Owned concern: bind admitted DVT Run workloads to one governed PostgreSQL connection.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Resolve the authorized connection reference before dispatch without persisting credentials.
 * @consequence DVT Run reaches Temporal with one exact non-secret PostgreSQL execution context.
 * @version 1.0.0
 */
import {
  DVT_REJECTIONS,
  DVT_POSTGRES_PLUGIN_CONTEXT_KEY,
  DvtOperationalRunWorkloadV1Schema,
  KNOWN_STEP_KINDS,
  type DvtOperationalRunWorkloadV1,
  type DvtOperationalRejection,
  type ExecutionPlan,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import type {
  IRunExecutionContextPreparer,
  PreparedRunPluginContext,
  RunExecutionContextPreparation,
} from '../../ports/runExecutionContextPreparer.js';
import {
  WarehouseConnectionNotFoundError,
  type IWarehouseConnectionCatalog,
} from '../../ports/warehouseSourceImport.js';

export class DvtPostgresRunExecutionContextPreparer implements IRunExecutionContextPreparer {
  public readonly contextKey = DVT_POSTGRES_PLUGIN_CONTEXT_KEY;

  public constructor(
    private readonly deps: {
      readonly catalog: IWarehouseConnectionCatalog;
      readonly predecessorReader?: DvtPostgresPublicationPredecessorReader;
    }
  ) {}

  public isRequired(plan: ExecutionPlan): boolean {
    return plan.steps.some(
      (step) => step.kind === KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD
    );
  }

  public async prepare(input: RunExecutionContextPreparation): Promise<PreparedRunPluginContext> {
    const steps = input.plan.steps.filter(
      (step) => step.kind === KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD
    );
    if (steps.length !== 1) {
      return { ok: false, ...DVT_REJECTIONS.runWorkloadCountInvalid };
    }

    const parsed = DvtOperationalRunWorkloadV1Schema.safeParse(steps[0]!.stepTypeConfig);
    if (!parsed.success) {
      return { ok: false, ...DVT_REJECTIONS.runIntentRequired };
    }
    const workload = parsed.data;
    const { connectionRef } = workload;

    try {
      const connection = await this.deps.catalog.getConnection(
        input.scope,
        connectionRef.connectionId
      );
      if (
        connection.id !== connectionRef.connectionId ||
        connection.type !== 'postgres' ||
        connection.credentialRef === undefined
      ) {
        return { ok: false, ...DVT_REJECTIONS.runConnectionUnavailable };
      }
      if (this.deps.predecessorReader === undefined) {
        return {
          ok: false,
          ...DVT_REJECTIONS.runPublicationUnavailable,
        };
      }
      const predecessor = await this.deps.predecessorReader.observe({
        credentialRef: connection.credentialRef,
        target: workload.output.target,
        schemaDigestSha256: workload.targetProjection.schemaDigestSha256,
      });
      if (!predecessor.ok) {
        return { ok: false, ...PREDECESSOR_REJECTIONS[predecessor.reason] };
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
        ok: true,
        context: {
          connectionRef,
          credentialRef: connection.credentialRef,
          publicationToken,
          expectedPredecessorToken: predecessor.predecessorToken ?? 'absent',
        },
      };
    } catch (error) {
      if (error instanceof WarehouseConnectionNotFoundError) {
        return { ok: false, ...DVT_REJECTIONS.runConnectionNotFound };
      }
      throw error;
    }
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

const PREDECESSOR_REJECTIONS = {
  credential_unavailable: DVT_REJECTIONS.runConnectionUnavailable,
  unmanaged_target: DVT_REJECTIONS.runTargetUnmanaged,
  schema_mismatch: DVT_REJECTIONS.runSchemaMismatch,
} as const satisfies Record<string, DvtOperationalRejection>;
