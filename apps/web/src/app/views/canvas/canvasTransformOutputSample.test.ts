import {
  DvtPostgresPublicationEvidenceSchema,
  PlanRefSchema,
  type DvtPostgresPublicationEvidence,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import type { RunSnapshot } from '../../ports/runs';
import type { PlanViewModel } from '../../types/plans';
import type { CanonicalNode } from '../../types/canonical';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import { resolveCanvasTransformOutputSampleTarget } from './canvasTransformOutputSample';

const PLAN_SHA = 'a'.repeat(64);
const PUBLICATION_TOKEN = 'f'.repeat(64);

function buildAuthority(): Readonly<{
  currentPlan: PlanViewModel;
  publication: DvtPostgresPublicationEvidence;
  runSnapshot: RunSnapshot;
  source: CanonicalNode;
  transform: CanonicalNode;
}> {
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
  const currentPlan: PlanViewModel = {
    planId: 'plan-1',
    planVersion: '1.0',
    planRef: PlanRefSchema.parse({
      schemaVersion: 'plan-ref.v1',
      planId: 'plan-1',
      planVersion: '1.0',
      uri: 'artifact://plans/plan-1/1.0',
      sha256: PLAN_SHA,
    }),
    generatedAt: '2026-09-15T10:00:00.000Z',
    adapter: 'postgres',
    target: 'postgresql-local',
    steps: [],
    capabilities: [],
  };
  const publication = DvtPostgresPublicationEvidenceSchema.parse({
    evidenceType: 'dvt-postgres-publication',
    environmentId: 'dev',
    plan: { planId: 'plan-1', planVersion: '1.0', sha256: PLAN_SHA },
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
    publication: { token: PUBLICATION_TOKEN, predecessorToken: null, outcome: 'created' },
    rowsWritten: 3,
    startedAt: '2026-09-15T10:00:01.000Z',
    completedAt: '2026-09-15T10:00:02.000Z',
    durationMs: 1000,
  });
  const runSnapshot: RunSnapshot = { runId: 'run-1', status: 'completed', publication };

  return { currentPlan, publication, runSnapshot, source, transform };
}

describe('Canvas Transform output sample authority', () => {
  it('resolves the published relation only when execution and authoring identities agree', () => {
    const authority = buildAuthority();

    expect(
      resolveCanvasTransformOutputSampleTarget({
        transform: authority.transform,
        graphNodes: [authority.source, authority.transform],
        currentPlan: authority.currentPlan,
        isCurrentPlanStale: false,
        runSnapshot: authority.runSnapshot,
      })
    ).toEqual({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/analytics/orders_enriched',
      expectedPublicationToken: PUBLICATION_TOKEN,
      nodeName: authority.transform.name,
    });
  });

  type AuthorityChange = Partial<{
    isCurrentPlanStale: boolean;
    runSnapshotStatus: RunSnapshot['status'];
    planSha: string;
    semanticPlanSha256: string;
    relation: string;
    omitSource: boolean;
  }>;
  const refusedAuthorities: readonly (readonly [string, AuthorityChange])[] = [
    ['stale plan', { isCurrentPlanStale: true }],
    ['running snapshot', { runSnapshotStatus: 'running' }],
    ['different plan', { planSha: '9'.repeat(64) }],
    ['different semantic document', { semanticPlanSha256: '8'.repeat(64) }],
    ['different result target', { relation: 'another_result' }],
    ['missing catalog authority', { omitSource: true }],
  ];

  it.each(refusedAuthorities)('refuses %s', (_name, change) => {
    const authority = buildAuthority();
    const publication = DvtPostgresPublicationEvidenceSchema.parse({
      ...authority.publication,
      plan: {
        ...authority.publication.plan,
        sha256: change.planSha ?? authority.publication.plan.sha256,
      },
      semanticPlanSha256: change.semanticPlanSha256 ?? authority.publication.semanticPlanSha256,
      target: {
        ...authority.publication.target,
        relation: change.relation ?? authority.publication.target.relation,
      },
    });

    expect(
      resolveCanvasTransformOutputSampleTarget({
        transform: authority.transform,
        graphNodes: change.omitSource
          ? [authority.transform]
          : [authority.source, authority.transform],
        currentPlan: authority.currentPlan,
        isCurrentPlanStale: change.isCurrentPlanStale ?? false,
        runSnapshot: {
          ...authority.runSnapshot,
          status: change.runSnapshotStatus ?? 'completed',
          publication,
        },
      })
    ).toBeNull();
  });
});
