/** Collect the existing physical, native and file publication authorities in their scoped order. */
import {
  readWorkspaceDbtModelReference,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringNode,
  type ConnectedSourceRef,
  type ConnectionRef,
} from '@dvt/contracts';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import {
  CanvasModelSqlUnavailableError,
  type ModelSqlPublishedInput,
} from '../ports/canvasModelSql.js';
import type { DbtModelProducer, IDbtModelProducerResolver } from '../ports/dbtModelProducer.js';

import { producerModelSqlPublication } from './canvasModelSqlPublications.js';
import { dvtSourcePublication } from './dvtSourcePublication.js';
import type { ResolveCanvasModelSqlPhysicalInput } from './resolveCanvasModelSqlPhysicalInput.js';
import type {
  ResolveCanvasTransformProjection,
  AuthorizedCanvasTransformProjection,
} from './resolveCanvasTransformProjection.js';

type InputResolutionState = {
  documents: Map<string, SubstraitDocument>;
  sources: Map<string, ConnectedSourceRef>;
  sourcePublications: Map<string, ReadonlySet<string>>;
  edges: Map<string, WorkspaceGraphAuthoringEdge>;
  external: Map<string, DbtModelProducer>;
  publications: ModelSqlPublishedInput[];
  literalConnections: Map<string, ConnectionRef>;
};
type InputResolutionFrame = Readonly<{
  draft: WorkspaceGraphAuthoringDraft;
  revision: string;
  context: AuthorizedExecutionContext;
}>;
type InputPublicationDependencies = Readonly<{
  projection: Pick<ResolveCanvasTransformProjection, 'execute'>;
  modelProducers: IDbtModelProducerResolver;
  physical: Pick<ResolveCanvasModelSqlPhysicalInput, 'execute'>;
}>;

function createInputResolutionState(
  incoming: readonly WorkspaceGraphAuthoringEdge[]
): InputResolutionState {
  return {
    documents: new Map(),
    sources: new Map(),
    sourcePublications: new Map(),
    edges: new Map(incoming.map((edge) => [edge.id, edge])),
    external: new Map(),
    publications: [],
    literalConnections: new Map(),
  };
}

function mergePreparedInputClosure(
  state: InputResolutionState,
  closure: AuthorizedCanvasTransformProjection['closure']
): void {
  for (const [id, document] of closure.documents) state.documents.set(id, document);
  for (const [id, connection] of closure.literalConnections ?? [])
    state.literalConnections.set(id, connection);
  for (const [id, producer] of closure.externalProducers) state.external.set(id, producer);
  for (const edge of closure.edges) state.edges.set(edge.id, edge);
  for (const source of closure.sources) {
    state.sources.set(source.node.id, source.ref);
    const published = dvtSourcePublication(source.node);
    if (published != null) state.sourcePublications.set(source.node.id, published);
  }
}

async function collectPhysicalInput(
  node: WorkspaceGraphAuthoringNode,
  context: AuthorizedExecutionContext,
  state: InputResolutionState,
  deps: InputPublicationDependencies
): Promise<void> {
  const publication = await deps.physical.execute(node, context);
  if (!('sourceRef' in publication.input.source))
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  state.sources.set(node.id, publication.input.source.sourceRef);
  state.sourcePublications.set(node.id, new Set(publication.columns.map((column) => column.id)));
  state.publications.push(publication);
}

async function collectNativeInput(
  node: WorkspaceGraphAuthoringNode,
  frame: InputResolutionFrame,
  state: InputResolutionState,
  deps: InputPublicationDependencies
): Promise<void> {
  const canvasId = frame.draft.activeCanvasId ?? frame.draft.canvas.id;
  if (canvasId == null) throw new CanvasModelSqlUnavailableError('model_unavailable');
  const prepared = await deps.projection.execute(
    { canvasId, transformNodeId: node.id },
    frame.context
  );
  if (prepared.draftRevision !== frame.revision)
    throw new CanvasModelSqlUnavailableError('stale_context');
  mergePreparedInputClosure(state, prepared.closure);
  const document = state.documents.get(node.id);
  if (document == null) throw new CanvasModelSqlUnavailableError('input_unavailable');
  state.publications.push(
    producerModelSqlPublication(node, document, prepared.closure.connectionRef)
  );
}

async function collectConnectedInputs(
  nodes: readonly WorkspaceGraphAuthoringNode[],
  frame: InputResolutionFrame,
  state: InputResolutionState,
  deps: InputPublicationDependencies
): Promise<void> {
  for (const node of nodes) {
    if (node.kind === 'dvt:source' && ['dvt', 'dvt.warehouse-source'].includes(node.pluginId))
      await collectPhysicalInput(node, frame.context, state, deps);
    else if (readWorkspaceDbtModelReference(node) == null)
      await collectNativeInput(node, frame, state, deps);
  }
}

async function collectFileInputs(
  nodes: readonly WorkspaceGraphAuthoringNode[],
  context: AuthorizedExecutionContext,
  state: InputResolutionState,
  deps: InputPublicationDependencies
): Promise<void> {
  const fileNodes = nodes.filter((node) => readWorkspaceDbtModelReference(node) != null);
  const unresolved = fileNodes.filter((node) => !state.external.has(node.id));
  if (unresolved.length > 0)
    for (const [id, producer] of await deps.modelProducers.resolve(unresolved, context))
      state.external.set(id, producer);
  for (const node of fileNodes) {
    const producer = state.external.get(node.id);
    if (producer == null) throw new CanvasModelSqlUnavailableError('input_unavailable');
    state.publications.push(
      producerModelSqlPublication(node, producer.document, producer.connection)
    );
  }
}

export async function collectCanvasModelSqlPublications(
  inputs: Readonly<{
    incoming: readonly WorkspaceGraphAuthoringEdge[];
    connected: readonly WorkspaceGraphAuthoringNode[];
  }>,
  frame: InputResolutionFrame,
  deps: InputPublicationDependencies
): Promise<InputResolutionState> {
  const state = createInputResolutionState(inputs.incoming);
  await collectConnectedInputs(inputs.connected, frame, state, deps);
  await collectFileInputs(inputs.connected, frame.context, state, deps);
  return state;
}
