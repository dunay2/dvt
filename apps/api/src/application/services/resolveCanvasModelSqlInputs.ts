/** Resolve connected publications through their existing physical/native/file authorities. */
import {
  DvtRelationalAuthoringDraftV1Schema,
  DvtTransformAuthoringAuthorityV1Schema,
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  readDvtInputBindings,
  readWorkspaceDbtModelReference,
  projectWorkspaceNodeInstanceEdges,
  resolveWorkspaceNodeInstances,
  type WorkspaceGraphAuthoringDraft,
  type ConnectedSourceRef,
} from '@dvt/contracts';
import type { SubstraitPostgresAstProjection } from '@dvt/postgres-projection';
import type { ProducerGraph, SubstraitDocument } from '@dvt/substrait-analysis';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';
import type { DbtModelProducer, IDbtModelProducerResolver } from '../ports/dbtModelProducer.js';

import { producerModelSqlPublication } from './canvasModelSqlPublications.js';
import { bindModelSqlReadInputs } from './canvasModelSqlReadInputs.js';
import { sameConnection } from './dvtSourceCoverage.js';
import { dvtSourcePublication } from './dvtSourcePublication.js';
import type { ResolveCanvasModelSqlPhysicalInput } from './resolveCanvasModelSqlPhysicalInput.js';
import type { ResolveCanvasTransformProjection } from './resolveCanvasTransformProjection.js';

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
    const nodes = resolveWorkspaceNodeInstances(draft.nodes);
    const allEdges = projectWorkspaceNodeInstanceEdges(draft.nodes, draft.edges);
    const incoming = allEdges.filter(
      (edge) =>
        edge.targetId === targetId && isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
    );
    if (new Set(incoming.map((edge) => edge.sourceId)).size !== incoming.length)
      throw new CanvasModelSqlUnavailableError('input_unavailable');
    const connected = incoming.map((edge) => nodes.find((node) => node.id === edge.sourceId)!);
    if (connected.some((node) => node == null))
      throw new CanvasModelSqlUnavailableError('input_unavailable');
    const target = nodes.find((node) => node.id === targetId)!;
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
    const pending = DvtRelationalAuthoringDraftV1Schema.safeParse(
      target.metadata?.['relationalAuthoringDraft']
    );
    const retainedDocuments = pending.success
      ? pending.data.sources.map(({ semanticDocument }) => ({
          plan: decodeDvtSubstraitPlanV1(semanticDocument),
          sidecar: semanticDocument.sidecar,
        }))
      : [];
    const documents = new Map<string, SubstraitDocument>();
    const sources = new Map<string, ConnectedSourceRef>();
    const sourcePublications = new Map<string, ReadonlySet<string>>();
    const edges = new Map(incoming.map((edge) => [edge.id, edge]));
    const external = new Map<string, DbtModelProducer>();
    const publications = [];
    for (const node of connected) {
      if (node.kind === 'dvt:source' && ['dvt', 'dvt.warehouse-source'].includes(node.pluginId)) {
        const publication = await this.deps.physical.execute(node, context);
        if (!('sourceRef' in publication.input.source))
          throw new CanvasModelSqlUnavailableError('input_unavailable');
        sources.set(node.id, publication.input.source.sourceRef);
        sourcePublications.set(node.id, new Set(publication.columns.map((column) => column.id)));
        publications.push(publication);
      } else if (readWorkspaceDbtModelReference(node) == null) {
        const canvasId = draft.activeCanvasId ?? draft.canvas.id;
        if (canvasId == null) throw new CanvasModelSqlUnavailableError('model_unavailable');
        const prepared = await this.deps.projection.execute(
          { canvasId, transformNodeId: node.id },
          context
        );
        if (prepared.draftRevision !== revision)
          throw new CanvasModelSqlUnavailableError('stale_context');
        for (const [id, document] of prepared.closure.documents) documents.set(id, document);
        for (const [id, producer] of prepared.closure.externalProducers) external.set(id, producer);
        for (const edge of prepared.closure.edges) edges.set(edge.id, edge);
        for (const source of prepared.closure.sources) {
          sources.set(source.node.id, source.ref);
          const published = dvtSourcePublication(source.node);
          if (published != null) sourcePublications.set(source.node.id, published);
        }
        const document = documents.get(node.id);
        if (document == null) throw new CanvasModelSqlUnavailableError('input_unavailable');
        publications.push(
          producerModelSqlPublication(node, document, prepared.closure.connectionRef)
        );
      }
    }
    const fileNodes = connected.filter((node) => readWorkspaceDbtModelReference(node) != null);
    const unresolved = fileNodes.filter((node) => !external.has(node.id));
    if (unresolved.length > 0)
      for (const [id, producer] of await this.deps.modelProducers.resolve(unresolved, context))
        external.set(id, producer);
    for (const node of fileNodes) {
      const producer = external.get(node.id);
      if (producer == null) throw new CanvasModelSqlUnavailableError('input_unavailable');
      publications.push(producerModelSqlPublication(node, producer.document, producer.connection));
    }
    const connectionRef = publications[0]?.connection ?? null;
    if (
      connectionRef != null &&
      publications.some((publication) => !sameConnection(publication.connection, connectionRef))
    )
      throw new CanvasModelSqlUnavailableError('input_unavailable');
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
