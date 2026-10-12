/** Test fixture: one authorized physical source and two canonical Read occurrences. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { CanonicalEdge, CanonicalNode } from '../../../types/canonical';
import { createSourceJoin } from '../canvasSourceJoin';
import { encodeDvtSubstraitSemanticDocument } from '../canvasDvtSubstraitSemanticDocument';
import type { SourceRelationInput } from '../canvasSourceRelation';
import { applyDvtSubstraitSemanticDocument } from '../canvasDvtTransformAuthoringAuthority';

export const occurrenceInput: SourceRelationInput = {
  source: {
    nodeId: 'source-places',
    schema: 'public',
    table: 'places',
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      sourceObjectId: 'public.places',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse',
        provider: 'postgres',
      },
    },
  },
  fields: ['id', 'parent_id'],
  fieldTypes: ['i64', 'i64'],
  fieldNullabilities: [false, true],
};

export function repeatedOccurrenceDraft() {
  return createSourceJoin({
    left: occurrenceInput,
    right: occurrenceInput,
    leftFieldName: 'parent_id',
    rightFieldName: 'id',
    targetNodeId: 'model',
    joinType: JoinRel_JoinType.LEFT,
  });
}

export function occurrenceGraph() {
  const input = occurrenceInput;
  const source: CanonicalNode = {
    id: input.source.nodeId,
    name: 'Places',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: input.source.schema,
      tableName: input.source.table,
      connectedSourceRef: input.source.sourceRef,
      columns: input.fields.map((name, index) => ({
        name,
        type: 'bigint',
        nullable: input.fieldNullabilities![index],
      })),
    },
  };
  const draft = repeatedOccurrenceDraft();
  const targetNode = applyDvtSubstraitSemanticDocument(
    {
      id: 'model',
      name: 'Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    encodeDvtSubstraitSemanticDocument(draft)
  );
  const edge: CanonicalEdge = {
    id: 'source-model',
    sourceId: source.id,
    targetId: targetNode.id,
    relation: 'lineage',
  };
  return { source, targetNode, draft, nodes: [source, targetNode], edges: [edge] };
}
