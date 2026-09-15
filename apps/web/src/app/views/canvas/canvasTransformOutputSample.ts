/** Owned concern: bind a completed DVT Transform publication to its exact sampled relation. */
import {
  buildRelationalSourceObjectId,
  ConnectedSourceRefSchema,
  type DvtPostgresPublicationEvidence,
} from '@dvt/contracts';

import type { RunSnapshot } from '../../ports/runs';
import type { CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { CanvasSourceDataSampleTarget } from './canvasSourceDataSample';

type TransformOutputSampleAuthority = Readonly<{
  transform: CanonicalNode;
  graphNodes: readonly CanonicalNode[];
  currentPlan: PlanViewModel | null;
  isCurrentPlanStale: boolean;
  runSnapshot: RunSnapshot | null | undefined;
}>;

function readRelationCatalog(sourceObjectId: string): string | null {
  const segments = sourceObjectId.split('/');
  if (segments.length !== 4 || segments[0] !== 'relation') return null;
  try {
    const catalog = decodeURIComponent(segments[1] ?? '');
    return catalog.length > 0 ? catalog : null;
  } catch {
    return null;
  }
}

function resolveTargetCatalog(
  graphNodes: readonly CanonicalNode[],
  publication: DvtPostgresPublicationEvidence
): string | null {
  const catalogs = new Set<string>();
  for (const node of graphNodes) {
    if (node.kind !== 'dvt:source') continue;
    const sourceRef = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
    if (
      !sourceRef.success ||
      sourceRef.data.connectionRef.connectionId !== publication.target.connectionRef.connectionId
    ) {
      continue;
    }
    const catalog = readRelationCatalog(sourceRef.data.sourceObjectId);
    if (catalog != null) catalogs.add(catalog);
  }
  return catalogs.size === 1 ? [...catalogs][0]! : null;
}

export function resolveCanvasTransformOutputSampleTarget({
  transform,
  graphNodes,
  currentPlan,
  isCurrentPlanStale,
  runSnapshot,
}: TransformOutputSampleAuthority): CanvasSourceDataSampleTarget | null {
  const publication = runSnapshot?.publication;
  const planRef = currentPlan?.planRef;
  const authoring = createDvtNodeAuthoringMetadata(transform);
  if (
    transform.kind !== 'dvt:transform' ||
    authoring?.kind !== 'transform' ||
    authoring.mode !== 'substrait' ||
    authoring.resultTarget == null ||
    runSnapshot?.status !== 'completed' ||
    publication == null ||
    planRef == null ||
    isCurrentPlanStale ||
    publication.plan.planId !== planRef.planId ||
    publication.plan.planVersion !== planRef.planVersion ||
    publication.plan.sha256 !== planRef.sha256 ||
    publication.semanticPlanSha256 !== authoring.sidecar.semanticPlanSha256 ||
    publication.target.connectionRef.connectionId !==
      authoring.resultTarget.connectionRef.connectionId ||
    publication.target.schema !== authoring.resultTarget.schema ||
    publication.target.relation !== authoring.resultTarget.relation
  ) {
    return null;
  }

  const catalog = resolveTargetCatalog(graphNodes, publication);
  if (catalog == null) return null;

  return {
    connectionId: publication.target.connectionRef.connectionId,
    objectId: buildRelationalSourceObjectId({
      kind: 'relation',
      catalog,
      schema: publication.target.schema,
      name: publication.target.relation,
      relationType: 'table',
    }),
    expectedPublicationToken: publication.publication.token,
    nodeName: transform.name,
  };
}
