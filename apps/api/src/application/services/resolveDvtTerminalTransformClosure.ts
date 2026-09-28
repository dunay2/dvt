/**
 * Owned concern: resolve protected producer dependencies for row previews,
 * retaining the bounded terminal authority for operational workload lowering.
 */
import {
  ConnectedSourceRefSchema,
  decodeDvtSubstraitPlanV1,
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_SET_PROFILE_ID,
  DvtTransformAuthoringAuthorityV1Schema,
  type ConnectionRef,
  type ConnectedSourceRef,
  type DvtTransformAuthoringAuthorityV1,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import {
  selectProtectedDvtTransforms,
  type DvtTransformSelection,
} from './dvtProtectedTransformSelection.js';
import { containsJoinRelation, containsSetRelation } from './dvtRelationFamily.js';
import { hasExactDvtSourceCoverage, sameConnection } from './dvtSourceCoverage.js';

export type DvtTerminalTransformClosure = {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly sources: readonly { node: WorkspaceGraphAuthoringNode; ref: ConnectedSourceRef }[];
  readonly transform: WorkspaceGraphAuthoringNode;
  readonly edges: readonly WorkspaceGraphAuthoringEdge[];
  readonly connectionRef: ConnectionRef;
  readonly profileId:
    | typeof DVT_POSTGRES_PROJECT_REL_PROFILE_ID
    | typeof DVT_POSTGRES_JOIN_PROFILE_ID
    | typeof DVT_POSTGRES_SET_PROFILE_ID;
  readonly authority: DvtTransformAuthoringAuthorityV1;
  readonly documents: ReadonlyMap<string, SubstraitDocument>;
  readonly preview: boolean;
};

export function resolveDvtTerminalTransformClosure(
  input: DvtTransformSelection
): DvtTerminalTransformClosure {
  const selection = selectProtectedDvtTransforms(input);
  const { draft, transform, transforms, edges } = selection;
  const sources = selection.sources.map((node) => ({
    node,
    ref: ConnectedSourceRefSchema.parse(node.metadata?.connectedSourceRef),
  }));
  const connectionRef = sources[0]!.ref.connectionRef;
  const authorities = transforms.map((node) => ({
    node,
    authority: DvtTransformAuthoringAuthorityV1Schema.parse(node.metadata?.transformAuthoring),
  }));
  const authority = authorities.find(({ node }) => node.id === transform.id)!.authority;
  const documents = new Map(
    authorities.map(({ node, authority: current }) => [
      node.id,
      {
        plan: decodeDvtSubstraitPlanV1(current.semanticDocument),
        sidecar: current.semanticDocument.sidecar,
      },
    ])
  );
  const semanticSources = authorities.flatMap(({ authority: current }) =>
    current.semanticDocument.sidecar.relations.flatMap(({ sourceRef }) =>
      sourceRef == null ? [] : [sourceRef]
    )
  );
  if (
    connectionRef.provider !== 'postgres' ||
    sources.some(({ ref }) => !sameConnection(ref.connectionRef, connectionRef)) ||
    !hasExactDvtSourceCoverage(
      semanticSources,
      sources.map(({ ref }) => ref),
      input.previewTargetId == null
    )
  ) {
    throw new Error(
      'Transform semantic sources must exactly match the selected connected Sources on one PostgreSQL connection.'
    );
  }
  const roots = [...documents.values()].flatMap(({ plan }) => {
    const root = plan.relations[0]?.relType;
    return root?.case === 'root' && root.value.input != null ? [root.value.input] : [];
  });
  const hasJoin = roots.some(containsJoinRelation);
  const hasSet = roots.some(containsSetRelation);
  if (
    (hasJoin && hasSet) ||
    ((hasJoin || hasSet) && semanticSources.length < 2) ||
    (!hasJoin && !hasSet && input.previewTargetId == null && sources.length !== 1)
  ) {
    throw new Error(
      'Transform operational profile must match its canonical semantic relation family.'
    );
  }

  return {
    draft,
    sources,
    transform,
    edges,
    connectionRef,
    authority,
    documents,
    preview: input.previewTargetId != null,
    profileId: hasJoin
      ? DVT_POSTGRES_JOIN_PROFILE_ID
      : hasSet
        ? DVT_POSTGRES_SET_PROFILE_ID
        : DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  };
}
