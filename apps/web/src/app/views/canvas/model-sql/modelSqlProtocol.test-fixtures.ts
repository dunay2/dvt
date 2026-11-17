/** Validated Model SQL protocol fixtures shared by panel and workspace interaction proofs. */
import {
  allocateDvtFieldId,
  ModelSqlContextResponseSchema,
  ModelSqlCompilationResponseSchema,
  type ModelSqlCompilationRequest,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { createDvtSubstraitProjectionDraft } from '../canvasDvtSubstraitProjection';
import { encodeDvtSubstraitSemanticDocument } from '../canvasDvtSubstraitSemanticDocument';
import { sourceRef } from '../CanvasRelationalTreeWorkbench.test-support';

export const modelSqlContext = ModelSqlContextResponseSchema.parse({
  schemaVersion: 'canvas-model-sql-context.v1',
  canvasId: 'canvas',
  transformNodeId: 'transform',
  draftRevision: 'r1',
  contextSha256: 'a'.repeat(64),
  semanticPlanSha256: null,
  connectionRef: sourceRef('orders').connectionRef,
  sql: null,
  inputs: [
    {
      nodeId: 'orders',
      name: 'Orders',
      sqlName: 'orders',
      columns: [{ id: 'orders_id', name: 'orders_id', dataType: 'string', nullable: true }],
    },
  ],
  diagnostics: [],
});
const document = createDvtSubstraitProjectionDraft({
  source: {
    nodeId: 'orders',
    schema: 'public',
    table: 'orders',
    sourceRef: sourceRef('orders'),
    fields: [{ name: 'orders_id', dataType: 'text' }],
  },
  targetNodeId: 'transform',
  outputs: [{ fieldId: allocateDvtFieldId(), name: 'orders_id', sourceFieldName: 'orders_id' }],
});
export function proposal(input: ModelSqlCompilationRequest) {
  const result = ModelSqlCompilationResponseSchema.parse({
    schemaVersion: 'canvas-model-sql-compilation.v1',
    canvasId: input.canvasId,
    transformNodeId: input.transformNodeId,
    draftRevision: input.draftRevision,
    contextSha256: input.contextSha256,
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
  if (result.status !== 'valid') throw new Error('Expected a complete fixture proposal.');
  return result;
}
