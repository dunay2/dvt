import { createHash } from 'node:crypto';

import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  KNOWN_STEP_KINDS,
  createDvtPostgresOutputSchemaDigestV1,
  parseExecutionPlan,
  type DvtOperationalWorkloadV2,
  type DvtPostgresOutputSchemaV1,
  type ExecutionPlan,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

export interface DvtPostgresPlanFixtureInput {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly relation: string;
  readonly sqlArtifact: { storageUri: string; sha256: string; sizeBytes: number };
}

export function createDvtPostgresExecutionPlan(input: DvtPostgresPlanFixtureInput): ExecutionPlan {
  const semanticPlanSha256 = digest('semantic:select-order');
  const schemaDigestSha256 = createDvtPostgresOutputSchemaDigestV1({
    schemaVersion: 'dvt-postgres-output-schema.v1',
    columns: [column(0, 'order_id', 'bigint'), column(1, 'status', 'text')],
    constraints: [],
    indexes: [],
  });
  const steps = [
    {
      stepId: 'transform-orders',
      kind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
      dependsOn: [],
      stepTypeConfig: {
        schemaVersion: 'dvt-operational-workload.v2',
        executionIntent: 'run',
        scope: {
          tenantId: input.tenantId,
          projectId: input.projectId,
          environmentId: input.environmentId,
        },
        graph: {
          draftRevision: 'revision-service-1',
          canvasId: 'canvas-service',
          selectedNodeIds: ['source-orders', 'transform-orders'],
          selectedEdgeIds: ['source-transform'],
        },
        semantics: [
          {
            transformNodeId: 'transform-orders',
            semanticPlanSha256,
            profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
          },
        ],
        targetProjection: {
          profileId: DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
          toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
          semanticPlanSha256,
          schemaDigestSha256,
          artifact: {
            artifactKind: 'compiled-sql',
            ...input.sqlArtifact,
            encoding: 'utf-8',
          },
        },
        connectionRef: connectionRef(),
        output: {
          kind: 'transform-result',
          nodeId: 'transform-orders',
          disposition: 'table',
          target: {
            schemaVersion: 'dvt-transform-result-target.v1',
            connectionRef: connectionRef(),
            schema: 'public',
            relation: input.relation,
          },
          publicationPolicy: 'postgres-stable-table-publication.v1',
        },
        publicationBoundaries: [],
      },
    },
  ];
  const inputHashSha256 = digest(`dvt-postgres:${input.sqlArtifact.sha256}:${input.relation}`);
  const planId = digest(
    jcsCanonicalize({
      metadata: { planVersion: CURRENT_EXECUTION_PLAN_VERSION, inputHashSha256 },
      steps,
    })
  );

  return parseExecutionPlan({
    metadata: {
      planId,
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256,
      createdAtIso: '2026-09-15T12:00:00.000Z',
      ownership: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        environmentId: input.environmentId,
      },
    },
    steps,
  });
}

export function digest(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function connectionRef(): DvtOperationalWorkloadV2['connectionRef'] {
  return {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-a',
    provider: 'postgres' as const,
  };
}

function column(
  ordinal: number,
  name: string,
  postgresType: 'bigint' | 'text'
): DvtPostgresOutputSchemaV1['columns'][number] {
  return {
    ordinal,
    name,
    postgresType,
    nullable: true,
    defaultExpression: null,
    generatedExpression: null,
    collation: null,
  };
}
