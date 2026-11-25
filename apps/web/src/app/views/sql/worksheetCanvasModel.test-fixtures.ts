/** Complete fixture built with the same canonical semantic constructor as Canvas authoring. */
import {
  allocateDvtFieldId,
  ModelSqlCompilationResponseSchema,
  WorksheetCanvasModelProposalSchema,
  type WorksheetCanvasModelRequest,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { createDvtSubstraitProjectionDraft } from '../canvas/canvasDvtSubstraitProjection';
import { encodeDvtSubstraitSemanticDocument } from '../canvas/canvasDvtSubstraitSemanticDocument';
import { sourceRef } from '../canvas/CanvasRelationalTreeWorkbench.test-support';

export function buildWorksheetCanvasProposal(
  input: WorksheetCanvasModelRequest,
  scope: WorkspaceGraphDraftScope,
  contextSha256 = 'a'.repeat(64)
) {
  const graphScope = {
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
  };
  if (input.verifyContextSha256 !== undefined)
    return WorksheetCanvasModelProposalSchema.parse({
      schemaVersion: 'worksheet-canvas-model-proposal.v1',
      status: 'current',
      scope: graphScope,
      canvasId: input.canvasId,
      expectedRevision: input.expectedRevision,
      modelId: input.modelId,
      name: input.name,
      connectionRef: input.connectionRef,
      sqlSha256: sha256HexUtf8(input.sql),
      contextSha256,
    });
  const ref = { ...sourceRef('orders'), connectionRef: input.connectionRef };
  const document = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'orders',
      schema: 'public',
      table: 'orders',
      sourceRef: ref,
      fields: [{ name: 'orders_id', dataType: 'text' }],
    },
    targetNodeId: input.modelId,
    outputs: [{ fieldId: allocateDvtFieldId(), name: 'orders_id', sourceFieldName: 'orders_id' }],
  });
  const compiled = ModelSqlCompilationResponseSchema.parse({
    schemaVersion: 'canvas-model-sql-compilation.v1',
    canvasId: input.canvasId,
    transformNodeId: input.modelId,
    draftRevision: input.expectedRevision,
    contextSha256: 'a'.repeat(64),
    sqlSha256: sha256HexUtf8(input.sql),
    status: 'valid',
    normalizedSql: input.sql,
    semanticDocument: encodeDvtSubstraitSemanticDocument(document),
    columns: [
      {
        id: document.sidecar.fields.at(-1)!.fieldId,
        name: 'orders_id',
        dataType: 'string',
        nullable: true,
      },
    ],
    inputAdditions: [{ nodeId: 'orders', columnId: 'orders_id' }],
    diagnostics: [],
  });
  if (compiled.status !== 'valid') throw new Error('Expected canonical fixture');
  const body = {
    schemaVersion: 'worksheet-canvas-model-proposal.v1' as const,
    status: 'valid' as const,
    scope,
    canvasId: input.canvasId,
    expectedRevision: input.expectedRevision,
    modelId: input.modelId,
    name: input.name,
    connectionRef: input.connectionRef,
    sqlSha256: sha256HexUtf8(input.sql),
    columns: compiled.columns,
    draft: {
      canvas: { id: input.canvasId, title: 'Canvas', kind: 'transformation' },
      activeCanvasId: input.canvasId,
      nodeIds: ['orders', input.modelId],
      nodePositions: { orders: { x: 0, y: 0 }, [input.modelId]: { x: 320, y: 0 } },
      nodes: [
        {
          id: 'orders',
          name: 'Orders',
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input' as const,
          status: 'idle' as const,
          tags: [],
          metadata: {
            connectedSourceRef: ref,
            schema: 'public',
            tableName: 'orders',
            columns: [{ name: 'orders_id', type: 'text', nullable: true }],
          },
        },
        {
          id: input.modelId,
          name: input.name,
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform' as const,
          status: 'idle' as const,
          tags: [],
          metadata: {
            transformAuthoring: {
              version: 'v1',
              mode: 'substrait',
              semanticDocument: compiled.semanticDocument,
            },
          },
        },
      ],
      edges: [
        {
          id: 'input-model',
          sourceId: 'orders',
          targetId: input.modelId,
          relation: 'lineage' as const,
        },
      ],
    },
  };
  const scopedBody = { ...body, scope: graphScope, contextSha256 };
  return WorksheetCanvasModelProposalSchema.parse({
    ...scopedBody,
    proposalSha256: sha256HexUtf8(jcsCanonicalize(scopedBody)),
  });
}
