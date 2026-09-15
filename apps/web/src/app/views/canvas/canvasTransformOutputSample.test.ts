import { DvtPostgresPublicationEvidenceSchema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { RunSnapshot } from '../../ports/runs';
import { resolveCanvasTransformOutputSampleTarget } from './canvasTransformOutputSample';
import { buildCanvasTransformOutputSampleAuthority } from './canvasTransformOutputSample.testSupport';

describe('Canvas Transform output sample authority', () => {
  it('resolves the published relation only when execution and authoring identities agree', () => {
    const authority = buildCanvasTransformOutputSampleAuthority();

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
      expectedPublicationToken: authority.publication.publication.token,
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
    const authority = buildCanvasTransformOutputSampleAuthority();
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
