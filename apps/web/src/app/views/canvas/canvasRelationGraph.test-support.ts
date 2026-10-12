import type { CanonicalNode } from '../../types/canonical';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { source } from './canvasRelationalOperator.test-support';
import { createSourceJoin } from './canvasSourceJoin';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

export function graphSource(name: string): CanonicalNode {
  const input = source(name);
  return {
    id: name,
    name,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: input.schema,
      tableName: name,
      connectedSourceRef: input.sourceRef,
      columns: input.fields.map((field) => ({ name: field.name, type: field.type })),
    },
  };
}

export function graphModel(document?: SubstraitDocument): CanonicalNode {
  const node: CanonicalNode = {
    id: 'model',
    name: 'Model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
  return document == null
    ? node
    : applyDvtSubstraitSemanticDocument(node, encodeDvtSubstraitSemanticDocument(document));
}

export function graphJoin(joinType = JoinRel_JoinType.INNER) {
  const inputs = ['left', 'right'].map(source);
  const document = createSourceJoin({
    left: { source: inputs[0]!, fields: ['customer_id', 'name'], fieldTypes: ['string', 'string'] },
    right: {
      source: inputs[1]!,
      fields: ['customer_id', 'name'],
      fieldTypes: ['string', 'string'],
    },
    leftFieldName: 'customer_id',
    rightFieldName: 'customer_id',
    targetNodeId: 'model',
    joinType,
  });
  const session = new CanvasRelationAnalysisSession('model');
  session.receive(document);
  return { document, session, sources: inputs.map((input) => graphSource(input.nodeId)) };
}

export async function appendGraphSource(session: CanvasRelationAnalysisSession, name: string) {
  const result = await session.query(session.rootId);
  return composeSourceRelation(session, {
    relationId: session.rootId,
    expectedRevision: session.revision,
    operation: 'inner_join',
    input: {
      ...source(name),
      fields: source(name).fields.map((field) => ({
        name: field.name,
        dataType: field.type,
        joinDataType: field.type,
      })),
    },
    predicate: { leftSourceFieldId: result.bindings[0]!.fieldId, rightFieldName: 'customer_id' },
  });
}
