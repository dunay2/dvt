import {
  DvtPostgresPublicationEvidenceSchema,
  PlanRefSchema,
  type DvtPostgresPublicationEvidence,
} from '@dvt/contracts';

import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import type { RunSnapshot } from '../../ports/runs';
import type { CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';

export interface CanvasTransformOutputSampleAuthority {
  readonly currentPlan: PlanViewModel;
  readonly publication: DvtPostgresPublicationEvidence;
  readonly runSnapshot: RunSnapshot;
  readonly source: CanonicalNode;
  readonly transform: CanonicalNode;
}

export function buildCanvasTransformOutputSampleAuthority(): CanvasTransformOutputSampleAuthority {
  const fixture = buildSemanticWorkbenchFixture();
  const connectionRef = {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'postgresql-local',
    provider: 'postgres' as const,
  };
  const transform = {
    ...fixture.transform,
    metadata: {
      ...fixture.transform.metadata,
      config: {
        ...((fixture.transform.metadata?.config as Record<string, unknown> | undefined) ?? {}),
        resultTarget: {
          schemaVersion: 'dvt-transform-result-target.v1' as const,
          connectionRef,
          schema: 'analytics',
          relation: 'orders_enriched',
        },
      },
    },
  };
  const authoring = createDvtNodeAuthoringMetadata(transform);
  if (authoring?.kind !== 'transform' || authoring.mode !== 'substrait') {
    throw new Error('Expected a Substrait Transform fixture.');
  }
  const source = {
    ...fixture.sources[0],
    metadata: {
      ...fixture.sources[0].metadata,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1' as const,
        connectionRef,
        sourceObjectId: 'relation/dvt/raw/orders',
      },
    },
  };
  const planRef = PlanRefSchema.parse({
    schemaVersion: 'plan-ref.v1',
    planId: 'plan-1',
    planVersion: '1.0',
    uri: 'artifact://plans/plan-1/1.0',
    sha256: 'a'.repeat(64),
  });
  const currentPlan: PlanViewModel = {
    planId: 'plan-1',
    planVersion: '1.0',
    planRef,
    generatedAt: '2026-09-15T10:00:00.000Z',
    adapter: 'postgres',
    target: 'postgresql-local',
    steps: [],
    capabilities: [],
  };
  const publication = DvtPostgresPublicationEvidenceSchema.parse({
    evidenceType: 'dvt-postgres-publication',
    environmentId: 'dev',
    plan: {
      planId: currentPlan.planId,
      planVersion: currentPlan.planVersion,
      sha256: planRef.sha256,
    },
    workloadSha256: 'b'.repeat(64),
    semanticPlanSha256: authoring.sidecar.semanticPlanSha256,
    projection: {
      profileId: 'dvt.vtx2.postgres.project-rel.v1',
      toolIdentity: 'pgsql-deparser@16.1.1',
      schemaDigestSha256: 'd'.repeat(64),
      sqlArtifact: {
        storageUri: `cas://sha256/${'e'.repeat(64)}`,
        sha256: 'e'.repeat(64),
        sizeBytes: 128,
      },
    },
    target: { connectionRef, schema: 'analytics', relation: 'orders_enriched' },
    publication: { token: 'f'.repeat(64), predecessorToken: null, outcome: 'created' },
    rowsWritten: 3,
    startedAt: '2026-09-15T10:00:01.000Z',
    completedAt: '2026-09-15T10:00:02.000Z',
    durationMs: 1000,
  });
  const runSnapshot: RunSnapshot = { runId: 'run-1', status: 'completed', publication };

  return { currentPlan, publication, runSnapshot, source, transform };
}
