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
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  encodeDvtSubstraitPlanV1,
  readWorkspaceDbtModelReference,
  type ConnectionRef,
  type ConnectedSourceRef,
  type DvtSubstraitSemanticDocumentV1,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import type { DbtModelProducer } from '../ports/dbtModelProducer.js';

import {
  selectProtectedDvtTransforms,
  type DvtTransformSelection,
} from './dvtProtectedTransformSelection.js';
import { containsJoinRelation, containsSetRelation } from './dvtRelationFamily.js';
import {
  distinctDvtSourceDefinitions,
  hasExactDvtSourceCoverage,
  sameConnection,
} from './dvtSourceCoverage.js';

export type DvtTerminalTransformClosure = {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly sources: readonly { node: WorkspaceGraphAuthoringNode; ref: ConnectedSourceRef }[];
  readonly transform: WorkspaceGraphAuthoringNode;
  readonly sink?: WorkspaceGraphAuthoringNode;
  readonly edges: readonly WorkspaceGraphAuthoringEdge[];
  readonly connectionRef: ConnectionRef;
  readonly profileId:
    | typeof DVT_POSTGRES_PROJECT_REL_PROFILE_ID
    | typeof DVT_POSTGRES_JOIN_PROFILE_ID
    | typeof DVT_POSTGRES_SET_PROFILE_ID;
  readonly semanticDocument: DvtSubstraitSemanticDocumentV1;
  readonly externalProducers: ReadonlyMap<string, DbtModelProducer>;
  readonly transformNodes: readonly WorkspaceGraphAuthoringNode[];
  readonly documents: ReadonlyMap<string, SubstraitDocument>;
  readonly preview: boolean;
};

export function resolveDvtTerminalTransformClosure(
  input: DvtTransformSelection,
  externalProducers: ReadonlyMap<string, DbtModelProducer> = new Map()
): DvtTerminalTransformClosure {
  const selection = selectProtectedDvtTransforms(input);
  const { draft, transform, transforms, edges } = selection;
  const sources = selection.sources.map((node) => ({
    node,
    ref: ConnectedSourceRefSchema.parse(node.metadata?.connectedSourceRef),
  }));
  for (const node of transforms) {
    if ((readWorkspaceDbtModelReference(node) != null) !== externalProducers.has(node.id))
      throw new Error(
        'Every file-model dependency requires a current authorized producer binding.'
      );
  }
  if ([...externalProducers.keys()].some((id) => !transforms.some((node) => node.id === id)))
    throw new Error('External producer binding is outside the selected closure.');
  const connectionRef =
    sources[0]?.ref.connectionRef ?? externalProducers.values().next().value?.connection;
  if (connectionRef == null) throw new Error('An execution connection is required.');
  const authorities = transforms
    .filter((node) => !externalProducers.has(node.id))
    .map((node) => ({
      node,
      authority: DvtTransformAuthoringAuthorityV1Schema.parse(node.metadata?.transformAuthoring),
    }));
  const native = authorities.find(({ node }) => node.id === transform.id)?.authority
    .semanticDocument;
  const external = externalProducers.get(transform.id)?.document;
  const semanticDocument =
    native ??
    (external == null
      ? undefined
      : {
          schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
          profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
          semanticPlan: encodeDvtSubstraitPlanV1(external.plan),
          sidecar: external.sidecar,
        });
  if (semanticDocument == null) throw new Error('The selected model has no resolved publication.');
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
    [...externalProducers.values()].some(
      (producer) => !sameConnection(producer.connection, connectionRef)
    ) ||
    (semanticSources.length > 0 &&
      !hasExactDvtSourceCoverage(
        semanticSources,
        distinctDvtSourceDefinitions(sources).map(({ ref }) => ref),
        input.previewTargetId == null
      )) ||
    (semanticSources.length === 0 && sources.length > 0)
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
    ((hasJoin || hasSet) && semanticSources.length + externalProducers.size < 2) ||
    (!hasJoin &&
      !hasSet &&
      input.previewTargetId == null &&
      sources.length + externalProducers.size !== 1)
  ) {
    throw new Error(
      'Transform operational profile must match its canonical semantic relation family.'
    );
  }

  return {
    draft,
    sources,
    transform,
    ...(selection.sink === undefined ? {} : { sink: selection.sink }),
    edges,
    connectionRef,
    semanticDocument,
    externalProducers,
    transformNodes: transforms,
    documents,
    preview: input.previewTargetId != null,
    profileId: hasJoin
      ? DVT_POSTGRES_JOIN_PROFILE_ID
      : hasSet
        ? DVT_POSTGRES_SET_PROFILE_ID
        : DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  };
}
