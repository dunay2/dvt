/** Protected producer/consumer fixtures retain one authority per Canvas node. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
  type DvtSubstraitSemanticDocumentV1,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { createProducerInput, type SubstraitDocument } from '@dvt/substrait-analysis';

import { buildDvtTerminalTransformPreviewDraft } from './workspaceGraphDraftFixture.js';

export function producerDocument(node: WorkspaceGraphAuthoringNode): SubstraitDocument {
  const document = DvtTransformAuthoringAuthorityV1Schema.parse(
    node.metadata?.transformAuthoring
  ).semanticDocument;
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

export function withProducerDocument(
  node: WorkspaceGraphAuthoringNode,
  document: SubstraitDocument
): WorkspaceGraphAuthoringNode {
  const previous = DvtTransformAuthoringAuthorityV1Schema.parse(
    node.metadata?.transformAuthoring
  ).semanticDocument;
  const semanticPlan = encodeDvtSubstraitPlanV1(document.plan);
  const semanticDocument: DvtSubstraitSemanticDocumentV1 = {
    ...previous,
    semanticPlan,
    sidecar: { ...document.sidecar, semanticPlanSha256: semanticPlan.sha256 },
  };
  return {
    ...node,
    metadata: {
      ...node.metadata,
      transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument },
    },
  };
}

export function consumerNode(
  producer: WorkspaceGraphAuthoringNode,
  id: string,
  outputName?: string
): WorkspaceGraphAuthoringNode {
  const source = producerDocument(producer);
  const input = createProducerInput(
    { nodeId: producer.id, name: producer.name, document: source },
    1
  );
  const fields: SubstraitDocument['sidecar']['fields'][number][] = [...input.fields];
  const relations: SubstraitDocument['sidecar']['relations'][number][] = [input.binding];
  let root = input.relation;
  if (outputName != null) {
    const relationId = allocateDvtRelationId();
    root = create(RelSchema, {
      relType: {
        case: 'project',
        value: {
          input: root,
          common: { relAnchor: 2, emitKind: { case: 'emit', value: { outputMapping: [0] } } },
        },
      },
    });
    relations.push({ relationId, relAnchor: 2 });
    fields.push({
      fieldId: allocateDvtFieldId(),
      relationId,
      outputOrdinal: 0,
      displayName: outputName,
      sourceFieldId: input.fields[0]!.fieldId,
    });
  }
  const names = outputName == null ? input.fields.map((field) => field.displayName!) : [outputName];
  return withProducerDocument(
    { ...producer, id, name: id },
    {
      plan: create(PlanSchema, {
        version: source.plan.version,
        relations: [{ relType: { case: 'root', value: { input: root, names } } }],
      }),
      sidecar: { ...source.sidecar, relations, fields },
    }
  );
}

export function buildProducerPreviewDraft(): WorkspaceGraphAuthoringDraft {
  const base = buildDvtTerminalTransformPreviewDraft();
  const source = base.nodes[0]!;
  const producer = base.nodes[1]!;
  const document = producerDocument(producer);
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
    throw new Error('Expected fixture Project.');
  const project = root.value.input.relType.value;
  if (project.input?.relType.case !== 'read' || project.common?.emitKind.case !== 'emit')
    throw new Error('Expected fixture Read.');
  const read = project.input.relType.value;
  read.baseSchema!.names.push('country');
  read.baseSchema!.struct!.types.push(
    globalThis.structuredClone(read.baseSchema!.struct!.types[0]!)
  );
  project.common.emitKind.value.outputMapping.push(1);
  root.value.names = ['published_id', 'published_country'];
  const inputField = allocateDvtFieldId();
  const readId = document.sidecar.relations[0]!.relationId;
  const projectId = document.sidecar.relations[1]!.relationId;
  const fields = document.sidecar.fields.map((field) =>
    field.relationId === projectId ? { ...field, displayName: 'published_id' } : field
  );
  fields.push(
    { fieldId: inputField, relationId: readId, outputOrdinal: 1, displayName: 'country' },
    {
      fieldId: allocateDvtFieldId(),
      relationId: projectId,
      outputOrdinal: 1,
      displayName: 'published_country',
      sourceFieldId: inputField,
    }
  );
  const published = withProducerDocument(producer, {
    ...document,
    sidecar: { ...document.sidecar, fields },
  });
  const consumer = consumerNode(published, 'consumer', 'consumer_id');
  const downstream = consumerNode(consumer, 'downstream');
  const nodes = [source, published, consumer, downstream];
  return {
    ...base,
    nodes,
    nodeIds: nodes.map((node) => node.id),
    nodePositions: Object.fromEntries(
      nodes.map((node, index) => [node.id, { x: index * 240, y: 0 }])
    ),
    edges: [
      ...base.edges,
      {
        id: 'producer-consumer',
        sourceId: published.id,
        targetId: consumer.id,
        relation: 'lineage',
      },
      {
        id: 'consumer-downstream',
        sourceId: consumer.id,
        targetId: downstream.id,
        relation: 'lineage',
      },
    ],
  };
}
