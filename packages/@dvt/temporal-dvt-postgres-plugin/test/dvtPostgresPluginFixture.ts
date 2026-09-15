import type { StepDefinition, StepExecutionContext } from '@dvt/adapter-temporal';
import {
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DvtOperationalWorkloadV2Schema,
  RunExecutionContextSchema,
  type DvtOperationalWorkloadV2,
  type RunExecutionContext,
} from '@dvt/contracts';

export const SHA = {
  artifact: 'a'.repeat(64),
  context: 'b'.repeat(64),
  plan: 'c'.repeat(64),
  predecessor: 'd'.repeat(64),
  publication: 'e'.repeat(64),
  schema: 'f'.repeat(64),
  semantic: '1'.repeat(64),
} as const;

export function buildDvtWorkload(): DvtOperationalWorkloadV2 {
  return DvtOperationalWorkloadV2Schema.parse({
    schemaVersion: 'dvt-operational-workload.v2',
    executionIntent: 'run',
    scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    graph: {
      draftRevision: 'revision-1',
      canvasId: 'canvas-a',
      selectedNodeIds: ['source-a', 'transform-a'],
      selectedEdgeIds: ['source-transform'],
    },
    semantics: [
      {
        transformNodeId: 'transform-a',
        semanticPlanSha256: SHA.semantic,
        profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
      },
    ],
    targetProjection: {
      profileId: DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
      toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
      semanticPlanSha256: SHA.semantic,
      schemaDigestSha256: SHA.schema,
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: SHA.artifact,
        storageUri: 'file:///artifacts/compiled.sql',
        sizeBytes: 9,
        encoding: 'utf-8',
      },
    },
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-a',
      provider: 'postgres',
    },
    output: {
      kind: 'transform-result',
      nodeId: 'transform-a',
      disposition: 'table',
      target: {
        schemaVersion: 'dvt-transform-result-target.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        schema: 'analytics',
        relation: 'orders_result',
      },
      publicationPolicy: 'postgres-stable-table-publication.v1',
    },
    publicationBoundaries: [],
  });
}

export function buildRunExecutionContext(): RunExecutionContext {
  return RunExecutionContextSchema.parse({
    schemaVersion: 'v1.0',
    planId: 'plan-a',
    planVersion: '1.0.0',
    planSha256: SHA.plan,
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'env-a',
    targetAdapter: 'temporal',
    createdAtIso: '2026-09-15T12:00:00.000Z',
    createdBy: 'test',
    pluginContexts: {
      'dvt-postgres': {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        credentialRef: 'env:DVT_POSTGRES_URL',
        publicationToken: SHA.publication,
        expectedPredecessorToken: SHA.predecessor,
      },
    },
  });
}

export function buildStep(config: unknown = buildDvtWorkload()): StepDefinition {
  return {
    stepId: 'transform-a',
    kind: 'DVT_POSTGRES_OPERATIONAL_WORKLOAD',
    dependsOn: [],
    stepTypeConfig: config,
  };
}

export function buildStepContext(): StepExecutionContext {
  return {
    executionIdentity: { tenantId: 'tenant-a', runId: 'run-a', environmentId: 'env-a' },
    runContext: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      runId: 'run-a',
      targetAdapter: 'temporal',
      logicalAttemptId: 1,
      originRunId: 'run-a',
      runExecutionContextRef: {
        uri: 'file:///contexts/run-a.json',
        sha256: SHA.context,
        schemaVersion: 'v1.0',
        planId: 'plan-a',
        planVersion: '1.0.0',
      },
    },
  };
}
