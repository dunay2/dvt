/** Lower a proposed SQL buffer through canonical producer admission; never persist it. */
import { decodeDvtSubstraitPlanV1, type TransformSqlDraftDataSampleRequest } from '@dvt/contracts';
import { projectSubstraitProducerGraph } from '@dvt/postgres-projection';
import { resolveProducerDocuments } from '@dvt/substrait-analysis';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';

import type { CompileCanvasModelSqlQuery } from './compileCanvasModelSqlQuery.js';

export class PrepareCanvasSqlDraftProjection {
  public constructor(private readonly compilation: Pick<CompileCanvasModelSqlQuery, 'prepare'>) {}

  public async execute(
    input: TransformSqlDraftDataSampleRequest,
    context: AuthorizedExecutionContext
  ) {
    const { response, prepared } = await this.compilation.prepare(input, context);
    if (response.status !== 'valid') throw new CanvasModelSqlUnavailableError('invalid_model');
    const connectionRef = prepared.response.connectionRef;
    if (connectionRef == null) throw new CanvasModelSqlUnavailableError('input_unavailable');
    const documents = new Map(prepared.graph.documents);
    documents.set(input.transformNodeId, {
      plan: decodeDvtSubstraitPlanV1(response.semanticDocument),
      sidecar: response.semanticDocument.sidecar,
    });
    const edges = prepared.graph.edges.map((edge) => {
      if (edge.targetId !== input.transformNodeId || edge.inputBindings == null) return edge;
      const additions = response.inputAdditions.filter(
        (addition) =>
          addition.nodeId === edge.sourceId &&
          !edge.inputBindings!.fields.some((field) => field.producerFieldId === addition.columnId)
      );
      return {
        ...edge,
        inputBindings: {
          ...edge.inputBindings,
          fields: [
            ...edge.inputBindings.fields,
            ...additions.map((addition) => ({
              producerFieldId: addition.columnId,
              inputId: `input:${encodeURIComponent(addition.nodeId)}:${encodeURIComponent(addition.columnId)}`,
            })),
          ],
        },
      };
    });
    const projection = await projectSubstraitProducerGraph({
      ...prepared.graph,
      documents,
      edges,
      externalProjections: prepared.externalProjections,
    });
    const available = new Map(documents);
    for (const [id, producer] of prepared.graph.externalProducers ?? [])
      available.set(id, producer.document);
    const consumed = resolveProducerDocuments(input.transformNodeId, available);
    const modelRefs = [...prepared.modelRefs].flatMap(([id, provenance]) =>
      consumed.has(id) ? [provenance] : []
    );
    return {
      response,
      projection,
      connectionRef,
      modelRefs,
      semanticPlanSha256: response.semanticDocument.semanticPlan.sha256,
    };
  }
}
