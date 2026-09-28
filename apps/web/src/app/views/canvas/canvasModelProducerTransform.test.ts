import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import {
  buildCanonicalTransform,
  SOURCE,
  EDGE,
  TRANSFORM,
} from './canvasOutputProjection.test-support';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { analyzeCanvasRelations } from './canvasRelationalAnalysis';
import { createCanvasRelationalTreeOperationDraft } from './canvasRelationalTreeOperationDraft';
import { canvasInputSlotId } from './canvasInputBindings';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

describe('explicit Transform from a model producer', () => {
  const producer = buildCanonicalTransform();
  const consumer = { ...TRANSFORM, id: 'consumer' };
  const nodes = [SOURCE, producer, consumer];
  const dependency = {
    ...EDGE,
    id: 'producer-consumer',
    sourceId: producer.id,
    targetId: consumer.id,
  };
  const edges = [EDGE, dependency];

  it('offers the connected producer in an empty editor without creating semantic authority', () => {
    const before = JSON.stringify(nodes);
    const analysis = analyzeCanvasRelations({ node: consumer, nodes, edges });
    expect(analysis.inputs).toHaveLength(1);
    expect(analysis.inputs[0]).toMatchObject({
      nodeId: producer.id,
      fields: [{ name: 'order_id' }, { name: 'customer_name' }],
    });
    expect(analysis.failure).toBe('missing-semantic-authority');
    expect(JSON.stringify(nodes)).toBe(before);
  });

  it('preserves structured parent fields and their children without copying producer operations', () => {
    const structured = composeDvtSubstraitProjectionFields(
      resolveCanvasProducerDocument(producer, nodes)!,
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      }
    );
    const published = applyDvtSubstraitSemanticDocument(
      producer,
      encodeDvtSubstraitSemanticDocument(structured)
    );
    const inputs = resolveCanvasDvtCompositionInputs({
      targetNodeId: consumer.id,
      nodes: [SOURCE, published, consumer],
      edges,
    });
    const draft = createCanvasRelationalTreeOperationDraft({
      operation: 'projection',
      inputs,
      selectedInputIds: [producer.id],
      targetNodeId: consumer.id,
    })!;
    const { index, schemas } = deriveSubstraitSchemas(draft);
    expect(index.relations.size).toBe(2);
    const producerSchemas = deriveSubstraitSchemas(structured);
    expect(schemas.get(index.rootId)?.map((field) => field.type)).toEqual(
      producerSchemas.schemas.get(producerSchemas.index.rootId)?.map((field) => field.type)
    );
    expect(schemas.get(index.rootId)?.at(-1)?.type.kind.case).toBe('struct');
    const fields = index.relations.get(index.rootId)!.fields;
    const parent = fields.find((field) => field.displayName === 'identity')!;
    expect(
      fields
        .filter((field) => field.parentFieldId === parent.fieldId)
        .map((field) => field.displayName)
    ).toEqual(['order_id', 'customer_name']);
  });

  it('rejects a namesake binding that does not reference a published FieldId', () => {
    const inputs = resolveCanvasDvtCompositionInputs({
      targetNodeId: consumer.id,
      nodes,
      edges: [
        EDGE,
        {
          ...dependency,
          metadata: {
            inputBindings: {
              version: 'v1',
              fields: [{ inputId: 'forged', producerFieldId: 'customer_name' }],
            },
          },
        },
      ],
    });
    expect(inputs).toEqual([]);
  });

  it.each([undefined, ['output:customer']])(
    'creates one local Read and an explicit Project, mapped by published IDs: %s',
    (selected) => {
      const inputBindings =
        selected == null
          ? undefined
          : {
              version: 'v1' as const,
              fields: selected.map((producerFieldId) => ({
                inputId: canvasInputSlotId(producer.id, producerFieldId),
                producerFieldId,
              })),
            };
      const inputs = resolveCanvasDvtCompositionInputs({
        targetNodeId: consumer.id,
        nodes,
        edges: [
          EDGE,
          { ...dependency, ...(inputBindings == null ? {} : { metadata: { inputBindings } }) },
        ],
      });
      const document = createCanvasRelationalTreeOperationDraft({
        operation: 'projection',
        inputs,
        selectedInputIds: [producer.id],
        targetNodeId: consumer.id,
      });
      expect(document).not.toBeNull();
      const { index, schemas } = deriveSubstraitSchemas(document!);
      const entries = [...index.relations.values()];
      expect(entries.map((entry) => entry.relation.relType.case).sort()).toEqual([
        'project',
        'read',
      ]);
      const read = entries.find((entry) => entry.relation.relType.case === 'read')!;
      expect(read.binding.sourceRef).toBeUndefined();
      expect(read.binding.producerRef?.nodeId).toBe(producer.id);
      expect(read.binding.producerRef?.fields.map((field) => field.producerFieldId)).toEqual([
        'output:order_id',
        'output:customer',
      ]);
      expect(
        read.relation.relType.case === 'read' && read.relation.relType.value.baseSchema?.names
      ).toEqual(['order_id', 'customer_name']);
      expect(index.relations.get(index.rootId)!.fields.map((field) => field.displayName)).toEqual(
        selected == null ? ['order_id', 'customer_name'] : ['customer_name']
      );
      expect(schemas.get(index.rootId)).toHaveLength(selected?.length ?? 2);
      expect(document!.sidecar.relations.every((binding) => binding.sourceRef == null)).toBe(true);
    }
  );
});
