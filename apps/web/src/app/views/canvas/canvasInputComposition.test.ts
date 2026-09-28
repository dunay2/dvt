import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { createSourceCross } from './canvasSourceCross';
import { createSourceJoin } from './canvasSourceJoin';
import { createSourceSet } from './canvasSourceSet';
import { toSourceRelationInput } from './canvasSourceRelation';
import type { CanonicalNode } from '../../types/canonical';
import { resolveUnmappedCanvasReadFields } from './canvasInputFieldEligibility';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { setDvtSourceOutputIncluded } from './canvasDvtSourceSemanticAuthoring';

const producer: CanonicalNode = {
  id: 'producer',
  name: 'Producer',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'public',
    tableName: 'clients',
    columns: [
      { name: 'id', type: 'text' },
      { name: 'country', type: 'text' },
    ],
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      sourceObjectId: 'public.clients',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse',
      },
    },
  },
};
function input(
  fields = [{ inputId: 'input-country', producerFieldId: 'country' }]
): Exclude<CanvasDvtCompositionInput, { sourceRef: null }> {
  const resolved = resolveCanvasDvtCompositionInputs({
    targetNodeId: 'consumer',
    nodes: [producer],
    edges: [
      {
        sourceId: producer.id,
        targetId: 'consumer',
        metadata: { inputBindings: { version: 'v1', fields } },
      },
    ],
  })[0]!;
  if (resolved?.sourceRef === null) throw new Error('Expected a physical source fixture.');
  return resolved;
}

describe('explicit Transform over mapped Input', () => {
  it('a whole dependency exposes published physical fields, not excluded raw fields', () => {
    const mutation = setDvtSourceOutputIncluded(producer, 'id', false);
    if (mutation.outcome !== 'applied') throw new Error('Expected source publication.');
    const edges = [{ sourceId: producer.id, targetId: 'consumer' }];
    const source = resolveCanvasDvtCompositionInputs({
      targetNodeId: 'consumer',
      nodes: [mutation.node],
      edges,
    })[0]!;
    const document = createCanvasRelationalTreeProjectionDraft({
      input: source,
      targetNodeId: 'consumer',
    });
    const index = deriveSubstraitSchemas(document).index;
    expect(index.relations.get(index.rootId)?.fields.map((field) => field.displayName)).toEqual([
      'country',
    ]);
    const denied = resolveUnmappedCanvasReadFields({
      document,
      nodeId: 'consumer',
      nodes: [mutation.node],
      edges,
    });
    const raw = [...index.relations.values()].find(
      (entry) => entry.relation.relType.case === 'read'
    )!;
    expect(denied.has(raw.fields.find((field) => field.displayName === 'id')!.fieldId)).toBe(true);
  });
  it('blocks later output and expression commands from reincorporating unmapped raw fields', async () => {
    const document = createCanvasRelationalTreeProjectionDraft({
      input: input(),
      targetNodeId: 'consumer',
    });
    const denied = resolveUnmappedCanvasReadFields({
      document,
      nodeId: 'consumer',
      nodes: [producer],
      edges: [
        { sourceId: producer.id, targetId: 'consumer', inputBindings: input().inputBindings },
      ],
    });
    const session = new CanvasRelationAnalysisSession('consumer');
    session.receive(document, denied);
    const index = deriveSubstraitSchemas(document).index;
    const raw = [...index.relations.values()].find(
      (entry) => entry.relation.relType.case === 'read'
    )!;
    const excluded = raw.fields.find((field) => field.displayName === 'id')!;
    expect(denied.has(excluded.fieldId)).toBe(true);
    const request = { relationId: session.rootId, expectedRevision: session.revision };
    await expect(
      applySelectedRelationDerivedOutput(session, {
        ...request,
        intent: 'edit',
        alias: 'forged',
        expression: { kind: 'field-ref', inputFieldId: excluded.fieldId },
      })
    ).rejects.toThrow();
    await expect(
      changeSelectedRelationOutputs(session, { ...request, outputs: [{ slot: 0 }] })
    ).rejects.toThrow(/mapped Input/);
    expect(session.revision).toBe(request.expectedRevision);
    session.dispose();
  });
  it('projects only the mapped producer fields while preserving the physical Read schema', () => {
    const source = input();
    expect(source.fields.map((field) => field.name)).toEqual(['id', 'country']);
    const document = createCanvasRelationalTreeProjectionDraft({
      input: source,
      targetNodeId: 'consumer',
    });
    const { index, schemas } = deriveSubstraitSchemas(document);
    expect(schemas.get(index.rootId)).toHaveLength(1);
    expect(index.relations.get(index.rootId)?.fields.map((field) => field.displayName)).toEqual([
      'country',
    ]);
    const read = [...index.relations.values()].find(
      (entry) => entry.relation.relType.case === 'read'
    )!;
    expect(
      read.relation.relType.case === 'read' && read.relation.relType.value.baseSchema?.names
    ).toEqual(['id', 'country']);
    expect(read.binding.sourceRef).toEqual(source.sourceRef);
    expect(index.relations.size).toBe(2);
  });
  it('requires an explicit Transform before raw partial JOIN and CROSS composition', () => {
    const source = input();
    expect(() =>
      createSourceJoin({
        left: toSourceRelationInput(source),
        right: toSourceRelationInput(source),
        leftFieldName: 'country',
        rightFieldName: 'country',
        targetNodeId: 'consumer',
      })
    ).toThrow(/explicit Transform/);
    expect(() => createSourceCross([source, source])).toThrow(/explicit Transform/);
  });
  it.each(['union_all', 'union_distinct', 'intersect_distinct', 'except_distinct'] as const)(
    'never projects a partial raw input only after %s',
    (operation) => {
      const source = input();
      const setInput = {
        ...source,
        fields: source.fields.map((field) => ({ name: field.name, type: field.joinDataType! })),
      };
      expect(() =>
        createSourceSet({ targetNodeId: 'consumer', operation, inputs: [setInput, setInput] })
      ).toThrow(/explicit Transform/);
    }
  );
  it('rejects unresolved field mappings rather than substituting a namesake', () => {
    expect(input([{ inputId: 'input-removed', producerFieldId: 'removed' }])).toBeUndefined();
  });
  it('accepts a complete producer without adding a hidden projection', () => {
    const source = input([
      { inputId: 'input-id', producerFieldId: 'id' },
      { inputId: 'input-country', producerFieldId: 'country' },
    ]);
    const document = createSourceCross([source, source]);
    const { index } = deriveSubstraitSchemas(document);
    expect(index.relations.size).toBe(3);
    expect(
      [...index.relations.values()].some((entry) => entry.relation.relType.case === 'project')
    ).toBe(false);
  });
});
