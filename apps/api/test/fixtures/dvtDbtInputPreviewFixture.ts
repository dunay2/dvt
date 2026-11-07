/** One valid mixed dbt-publication/physical-input JOIN for selected preview regressions. */
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  ConnectedSourceRefSchema,
  decodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
  encodeDvtSubstraitPlanV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import {
  pgQualifiedColumnRef,
  pgRangeVar,
  projectExternalProducerAst,
} from '@dvt/postgres-projection';
import { createExternalProducerSignature, deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import type { DbtModelProducer } from '../../src/application/ports/dbtModelProducer.js';

import { buildDvtJoinPreviewDraft } from './dvtJoinPreviewFixture.js';

export function buildDbtInputPreviewFixture(): {
  draft: WorkspaceGraphAuthoringDraft;
  externalProducers: ReadonlyMap<string, DbtModelProducer>;
  targetId: string;
  modelRelationId: string;
  physicalRelationId: string;
  joinRelationId: string;
  semanticPlanSha256: string;
} {
  const draft = buildDvtJoinPreviewDraft(2);
  const target = draft.nodes.find((node) => node.id === 'transform-orders')!;
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    target.metadata?.transformAuthoring
  );
  const document = {
    plan: decodeDvtSubstraitPlanV1(authority.semanticDocument),
    sidecar: authority.semanticDocument.sidecar,
  };
  const analysis = deriveSubstraitSchemas(document);
  const binding = document.sidecar.relations.find((relation) => relation.sourceRef != null)!;
  const sourceRef = binding.sourceRef!;
  const model = draft.nodes.find((node) => {
    const source = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
    return source.success && source.data.sourceObjectId === sourceRef.sourceObjectId;
  })!;
  const schema = model.metadata?.schema;
  const table = model.metadata?.tableName;
  if (typeof schema !== 'string' || typeof table !== 'string')
    throw new Error('Expected physical fixture input.');
  const indexed = analysis.index.relations.get(binding.relationId)!;
  const types = analysis.schemas.get(binding.relationId)!;
  const fields = indexed.fields.map((field, index) => ({
    fieldId: allocateDvtFieldId(),
    name: field.displayName!,
    type: types[index]!.type,
  }));
  if (fields.some((field) => field.type.kind.case !== 'string'))
    throw new Error('Expected text JOIN fixture fields.');
  const relationId = allocateDvtRelationId();
  const signature = createExternalProducerSignature({
    relationId,
    names: ['file-owner', 'model.demo.orders'],
    fields,
  });
  const provenance = {
    canvasId: 'file-owner',
    uniqueId: 'model.demo.orders',
    contentSetSha256: 'a'.repeat(64),
    analysisSha256: 'b'.repeat(64),
  };
  model.kind = 'transform';
  model.pluginId = 'dvt';
  model.role = 'transform';
  model.metadata = {
    dbtModelReference: {
      schemaVersion: 'workspace-dbt-model-reference.v1',
      canvasId: provenance.canvasId,
      uniqueId: provenance.uniqueId,
      relationId,
      connectionRef: sourceRef.connectionRef,
      fields: fields.map((field) => ({
        fieldId: field.fieldId,
        name: field.name,
        dataType: 'text',
        nullable: true,
      })),
    },
  };
  delete binding.sourceRef;
  binding.producerRef = {
    nodeId: model.id,
    fields: indexed.fields.map((field, index) => ({
      fieldId: field.fieldId,
      producerFieldId: fields[index]!.fieldId,
    })),
  };
  if (
    indexed.relation.relType.case !== 'read' ||
    indexed.relation.relType.value.readType.case !== 'namedTable'
  ) {
    throw new Error('Expected named Read fixture.');
  }
  indexed.relation.relType.value.readType.value.names = [model.id];
  authority.semanticDocument.semanticPlan = encodeDvtSubstraitPlanV1(document.plan);
  authority.semanticDocument.sidecar.semanticPlanSha256 =
    authority.semanticDocument.semanticPlan.sha256;
  target.metadata = { ...target.metadata, transformAuthoring: authority };
  const projection = projectExternalProducerAst(signature, {
    SelectStmt: {
      targetList: fields.map((field) => ({
        ResTarget: { name: field.name, val: pgQualifiedColumnRef('published', field.name) },
      })),
      fromClause: [pgRangeVar({ schema, table, alias: 'published' })],
      op: 'SETOP_NONE',
      limitOption: 'LIMIT_OPTION_DEFAULT',
    },
  });
  const externalProducers: ReadonlyMap<string, DbtModelProducer> = new Map([
    [
      model.id,
      {
        document: signature,
        connection: sourceRef.connectionRef,
        projection,
        provenance,
      },
    ],
  ]);
  return {
    draft,
    externalProducers,
    targetId: target.id,
    modelRelationId: binding.relationId,
    physicalRelationId: document.sidecar.relations.find((relation) => relation.sourceRef != null)!
      .relationId,
    joinRelationId: analysis.index.rootId,
    semanticPlanSha256: authority.semanticDocument.semanticPlan.sha256,
  };
}
