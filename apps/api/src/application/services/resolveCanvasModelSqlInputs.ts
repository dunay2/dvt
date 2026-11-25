/** Resolve connected publications through their existing physical/native/file authorities. */
import {
  DvtRelationalAuthoringDraftV1Schema,
  DvtTransformAuthoringAuthorityV1Schema,
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  readDvtInputBindings,
  projectWorkspaceNodeInstanceEdges,
  resolveWorkspaceNodeInstances,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringNode,
  type ConnectionRef,
} from '@dvt/contracts';
import type { SubstraitPostgresAstProjection } from '@dvt/postgres-projection';
import type { ProducerGraph, SubstraitDocument } from '@dvt/substrait-analysis';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import {
  CanvasModelSqlUnavailableError,
  type ModelSqlPublishedInput,
} from '../ports/canvasModelSql.js';
import type { IDbtModelProducerResolver } from '../ports/dbtModelProducer.js';

import { readCanvasLiteralModelConnection } from './canvasLiteralModelConnection.js';
import { collectCanvasModelSqlPublications } from './canvasModelSqlInputPublications.js';
import { bindModelSqlReadInputs } from './canvasModelSqlReadInputs.js';
import { sameConnection } from './dvtSourceCoverage.js';
import type { ResolveCanvasModelSqlPhysicalInput } from './resolveCanvasModelSqlPhysicalInput.js';
import type { ResolveCanvasTransformProjection } from './resolveCanvasTransformProjection.js';

function connectedSqlModelInputs(
  draft: WorkspaceGraphAuthoringDraft,
  targetId: string
): Readonly<{
  incoming: WorkspaceGraphAuthoringEdge[];
  connected: WorkspaceGraphAuthoringNode[];
  target: WorkspaceGraphAuthoringNode;
}> {
  const nodes = resolveWorkspaceNodeInstances(draft.nodes);
  const incoming = projectWorkspaceNodeInstanceEdges(draft.nodes, draft.edges).filter(
    (edge) => edge.targetId === targetId && isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
  );
  if (new Set(incoming.map((edge) => edge.sourceId)).size !== incoming.length)
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  const connected = incoming.map((edge) => nodes.find((node) => node.id === edge.sourceId)!);
  if (connected.some((node) => node == null))
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return { incoming, connected, target: nodes.find((node) => node.id === targetId)! };
}

function readCurrentSqlModelDocument(
  target: WorkspaceGraphAuthoringNode
): SubstraitDocument | null {
  const authority = DvtTransformAuthoringAuthorityV1Schema.safeParse(
    target.metadata?.['transformAuthoring']
  );
  const currentDocument = authority.success
    ? {
        plan: decodeDvtSubstraitPlanV1(authority.data.semanticDocument),
        sidecar: authority.data.semanticDocument.sidecar,
      }
    : null;
  if (target.metadata?.['transformAuthoring'] != null && !authority.success)
    throw new CanvasModelSqlUnavailableError('invalid_model');
  return currentDocument;
}

function readSqlModelDocuments(target: WorkspaceGraphAuthoringNode): Readonly<{
  currentDocument: SubstraitDocument | null;
  retainedDocuments: SubstraitDocument[];
}> {
  const currentDocument = readCurrentSqlModelDocument(target);
  const pending = DvtRelationalAuthoringDraftV1Schema.safeParse(
    target.metadata?.['relationalAuthoringDraft']
  );
  const retainedDocuments = pending.success
    ? pending.data.sources.map(({ semanticDocument }) => ({
        plan: decodeDvtSubstraitPlanV1(semanticDocument),
        sidecar: semanticDocument.sidecar,
      }))
    : [];
  return { currentDocument, retainedDocuments };
}

function consistentInputConnection(
  publications: readonly ModelSqlPublishedInput[],
  literalConnection: ConnectionRef | undefined
): ConnectionRef | null {
  const connectionRef = publications[0]?.connection ?? literalConnection ?? null;
  if (
    connectionRef != null &&
    publications.some((publication) => !sameConnection(publication.connection, connectionRef))
  )
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return connectionRef;
}

export class ResolveCanvasModelSqlInputs {
  public constructor(
    private readonly deps: Readonly<{
      projection: Pick<ResolveCanvasTransformProjection, 'execute'>;
      modelProducers: IDbtModelProducerResolver;
      physical: Pick<ResolveCanvasModelSqlPhysicalInput, 'execute'>;
    }>
  ) {}

  public async execute(
    draft: WorkspaceGraphAuthoringDraft,
    targetId: string,
    revision: string,
    context: AuthorizedExecutionContext
  ) {
    const { incoming, connected, target } = connectedSqlModelInputs(draft, targetId);
    const { currentDocument, retainedDocuments } = readSqlModelDocuments(target);
    const state = await collectCanvasModelSqlPublications(
      { incoming, connected },
      { draft, revision, context },
      this.deps
    );
    const {
      documents,
      sources,
      sourcePublications,
      edges,
      external,
      publications,
      literalConnections,
    } = state;
    const literalConnection =
      incoming.length === 0 ? readCanvasLiteralModelConnection(target, currentDocument) : undefined;
    if (literalConnection != null) literalConnections.set(targetId, literalConnection);
    const connectionRef = consistentInputConnection(publications, literalConnection);
    const inputs = bindModelSqlReadInputs(publications, [
      ...(currentDocument == null ? [] : [currentDocument]),
      ...retainedDocuments,
    ]);
    const graph: ProducerGraph = {
      targetId,
      documents,
      sources,
      sourcePublications,
      externalProducers: external,
      edges: [...edges.values()].map((edge) => {
        const binding = readDvtInputBindings(edge);
        return { ...edge, ...(binding == null ? {} : { inputBindings: binding }) };
      }),
      literalConnections,
    };
    return {
      inputs,
      connectionRef,
      source: {
        inputs: inputs.map((publication) => publication.input),
        currentDocument,
        retainedDocuments,
      },
      graph,
      externalProjections: new Map<string, SubstraitPostgresAstProjection>(
        [...external].map(([id, producer]) => [id, producer.projection])
      ),
      provenance: [...external].map(([id, producer]) => ({ id, ...producer.provenance })),
      dependencyDigests: [...documents].map(([id, document]) => ({
        id,
        plan: encodeDvtSubstraitPlanV1(document.plan).sha256,
        sidecar: document.sidecar,
      })),
      sourceRefs: [...sources.values()],
      modelRefs: new Map([...external].map(([id, producer]) => [id, producer.provenance])),
    };
  }
}
