import { describe, expect, it } from 'vitest';

import {
  DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  KNOWN_STEP_KINDS,
  createDefaultStepTypeRegistry,
  DvtOperationalWorkloadContractV1,
  type DvtOperationalWorkloadV1,
} from '../src/index.js';

const DIGESTS = {
  semantic: 'a'.repeat(64),
  sql: 'b'.repeat(64),
};

function buildWorkload(): DvtOperationalWorkloadV1 {
  return {
    schemaVersion: 'dvt-operational-workload.v1',
    scope: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
    },
    graph: {
      draftRevision: 'revision-7',
      canvasId: 'canvas-a',
      selectedNodeIds: ['source-a', 'transform-a'],
      selectedEdgeIds: ['source-transform'],
    },
    semantics: [
      {
        transformNodeId: 'transform-a',
        semanticPlanSha256: DIGESTS.semantic,
        profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
      },
    ],
    targetProjection: {
      profileId: DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
      toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
      semanticPlanSha256: DIGESTS.semantic,
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: DIGESTS.sql,
        storageUri: `s3://dvt-artifacts/tenants/tenant-a/${DIGESTS.sql}`,
        sizeBytes: 128,
        encoding: 'utf-8',
      },
    },
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-a',
      provider: 'postgres',
    },
    output: {
      kind: 'ephemeral-preview',
      nodeId: 'transform-a',
    },
  };
}

describe('DVT terminal Transform operational workload contract', () => {
  it('accepts one ephemeral ProjectRel workload bound to exact protected identities', () => {
    const parsed = DvtOperationalWorkloadContractV1.schema.parse(buildWorkload());

    expect(parsed.graph.selectedNodeIds).toEqual(['source-a', 'transform-a']);
    expect(parsed.graph.selectedEdgeIds).toEqual(['source-transform']);
    expect(parsed.output).toEqual({ kind: 'ephemeral-preview', nodeId: 'transform-a' });
    expect(parsed.targetProjection.artifact.artifactKind).toBe('compiled-sql');
    expect(DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY).toBe(
      'executor.dvt-postgres-operational-workload'
    );
  });

  it('accepts planner-resolved timeout and concurrency policy', () => {
    const parsed = DvtOperationalWorkloadContractV1.schema.parse({
      ...buildWorkload(),
      stepTimeoutMs: 300_000,
      concurrency: { maxInFlight: 4 },
    });

    expect(parsed.stepTimeoutMs).toBe(300_000);
    expect(parsed.concurrency).toEqual({ maxInFlight: 4 });
  });

  it.each([
    [
      'duplicate selected nodes',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        graph: {
          ...workload.graph,
          selectedNodeIds: ['source-a', 'source-a'],
        },
      }),
    ],
    [
      'an output outside the selected closure',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        output: { ...workload.output, nodeId: 'transform-other' },
      }),
    ],
    [
      'a semantic Transform outside the selected closure',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        semantics: [{ ...workload.semantics[0]!, transformNodeId: 'transform-other' }],
      }),
    ],
    [
      'a stale target projection semantic digest',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        targetProjection: {
          ...workload.targetProjection,
          semanticPlanSha256: 'c'.repeat(64),
        },
      }),
    ],
    [
      'a non-PostgreSQL connection',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        connectionRef: { ...workload.connectionRef, provider: 'snowflake' },
      }),
    ],
    [
      'a broader projection profile',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        targetProjection: {
          ...workload.targetProjection,
          profileId: 'dvt.vtx2.postgres.v1',
        },
      }),
    ],
    [
      'inline SQL',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        targetProjection: { ...workload.targetProjection, sql: 'select 1' },
      }),
    ],
    [
      'inline Substrait bytes',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        semantics: [{ ...workload.semantics[0]!, planBase64: 'AAAA' }],
      }),
    ],
    [
      'publication intent',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        publication: { kind: 'postgres-stable-table' },
      }),
    ],
    [
      'more than one semantic Transform',
      (workload: DvtOperationalWorkloadV1) => ({
        ...workload,
        semantics: [...workload.semantics, { ...workload.semantics[0]!, transformNodeId: 'two' }],
      }),
    ],
  ])('rejects %s', (_label, mutate) => {
    expect(DvtOperationalWorkloadContractV1.schema.safeParse(mutate(buildWorkload())).success).toBe(
      false
    );
  });

  it('registers the workload once with its real missing executor capability', () => {
    const registry = createDefaultStepTypeRegistry();
    const kind = KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD;

    expect(
      registry.validate(kind, buildWorkload(), {
        planOwnership: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'env-a',
        },
      }).success
    ).toBe(true);
    expect(registry.getExecutionProfile?.(kind)).toEqual({
      supportedAdapters: ['temporal'],
      requiredCapabilities: [DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY],
    });
  });
  it('requires workload scope to match immutable plan ownership', () => {
    const workload = buildWorkload();

    expect(
      DvtOperationalWorkloadContractV1.validatePlanOwnership(workload, {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
      })
    ).toBeUndefined();
    expect(
      DvtOperationalWorkloadContractV1.validatePlanOwnership(workload, {
        tenantId: 'tenant-b',
        projectId: 'project-a',
        environmentId: 'env-a',
      })
    ).toBeDefined();
    expect(
      DvtOperationalWorkloadContractV1.validatePlanOwnership(workload, undefined)
    ).toBeDefined();
  });
});
