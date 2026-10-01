import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import {
  readCanvasRelationalAuthoringDraft,
  restoreCanvasRelationalAuthoringDraft,
  createCanvasRelationalAuthoringDraft,
} from './canvasRelationalAuthoringDraft';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { source } from './canvasRelationalOperator.test-support';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import {
  buildCanonicalTransform,
  SOURCE,
  TRANSFORM,
  EDGE,
} from './canvasOutputProjection.test-support';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { createSourceDocument } from './canvasSourceDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  applyCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';

describe('relational authoring draft restoration', () => {
  it('retires terminal authority but preserves layout through inspector save and reopening', () => {
    const { document, session } = graphJoin();
    const model = graphModel(document);
    const positions = { [session.rootId]: { x: 360, y: 420 } };
    model.metadata = {
      ...model.metadata,
      relationalAuthoringDraft: {
        version: 'v1',
        sources: [],
        operations: [],
        outputRelationId: 'obsolete-root',
        positions,
      },
    };
    const expected = { version: 'v1', sources: [], operations: [], positions };
    const draft = readCanvasRelationalAuthoringDraft(model);
    expect(draft).toEqual(expected);
    const saved = applyCanvasInspectorNodeDraft(model, createCanvasInspectorNodeDraft(model));
    expect(saved.metadata?.relationalAuthoringDraft).toEqual(expected);
    const restored = restoreCanvasRelationalAuthoringDraft(
      readCanvasRelationalAuthoringDraft(saved)!,
      [],
      document
    );
    expect(restored?.outputRelationId).toBe(session.rootId);
    expect(restored?.positions).toEqual(new Map(Object.entries(positions)));
    expect(restored?.operations).toEqual([]);
  });

  it('preserves applied-card and Output positions when creating a save snapshot', () => {
    const positions = new Map([
      ['applied-relation', { x: 180, y: 240 }],
      ['output', { x: 520, y: 100 }],
    ]);
    expect(
      createCanvasRelationalAuthoringDraft({
        sources: [],
        operations: [],
        outputRelationId: 'applied-relation',
        positions,
      }).positions
    ).toEqual(Object.fromEntries(positions));
  });
  const physical = source('orders');
  const input: CanvasDvtCompositionInput = {
    ...physical,
    fields: physical.fields.map((field) => ({
      name: field.name,
      dataType: field.type,
      joinDataType: field.type,
    })),
  };

  it('preserves the same Read and field identities when physical column order changes', () => {
    const occurrence = createPendingSourceOccurrence(input);
    const draft = createCanvasRelationalAuthoringDraft({
      sources: [occurrence],
      operations: [],
      outputRelationId: null,
      positions: new Map(),
    });
    const restored = restoreCanvasRelationalAuthoringDraft(draft, [
      {
        ...input,
        fields: [...input.fields].reverse(),
      },
    ]);
    expect(restored?.sources[0]?.read).toEqual(occurrence.read);
    expect(JSON.parse(JSON.stringify(draft))).toEqual(draft);
  });

  it.each(['missing', 'out-of-range'] as const)(
    'refuses restoring a Read with %s identities',
    (fault) => {
      const draft = createCanvasRelationalAuthoringDraft({
        sources: [createPendingSourceOccurrence(input)],
        operations: [],
        outputRelationId: null,
        positions: new Map(),
      });
      const fields = draft.sources[0]!.semanticDocument.sidecar.fields;
      if (fault === 'missing') fields.pop();
      else fields[0]!.outputOrdinal = fields.length;
      expect(restoreCanvasRelationalAuthoringDraft(draft, [input])).toBeNull();
    }
  );

  it.each(['rename', 'add', 'remove', 'type', 'source'] as const)(
    'rejects incompatible physical provenance without silently restoring another field (%s)',
    (change) => {
      const occurrence = createPendingSourceOccurrence(input);
      const draft = createCanvasRelationalAuthoringDraft({
        sources: [occurrence],
        operations: [],
        outputRelationId: null,
        positions: new Map(),
      });
      const fields = [...input.fields];
      if (change === 'rename') fields[0] = { ...fields[0]!, name: 'renamed' };
      if (change === 'add') fields.push({ ...fields[0]!, name: 'extra' });
      if (change === 'remove') fields.pop();
      if (change === 'type') fields[0] = { ...fields[0]!, joinDataType: 'i64' };
      const current = {
        ...input,
        fields,
        sourceRef:
          change === 'source'
            ? { ...physical.sourceRef, sourceObjectId: 'public.other' }
            : physical.sourceRef,
      };
      const before = JSON.stringify(draft);
      expect(restoreCanvasRelationalAuthoringDraft(draft, [current])).toBeNull();
      expect(JSON.stringify(draft)).toBe(before);
    }
  );

  it('keeps a dependent expression bound to its saved field after reopening a reordered source', async () => {
    const occurrence = createPendingSourceOccurrence(input);
    const session = new CanvasRelationAnalysisSession('pending-derived');
    session.receive(createSourceDocument([occurrence.read], occurrence.read));
    try {
      const document = await applySelectedRelationDerivedOutput(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'normalized_id',
        formula: 'UPPER(customer_id)',
      });
      const semanticDocument = encodeDvtSubstraitSemanticDocument(document);
      const draft = createCanvasRelationalAuthoringDraft({
        sources: [occurrence],
        operations: [
          {
            id: session.rootId,
            operation: 'field_transform',
            inputs: [occurrence.read.binding.relationId],
            semanticDocument,
          },
        ],
        outputRelationId: null,
        positions: new Map(),
      });
      const restored = restoreCanvasRelationalAuthoringDraft(draft, [
        { ...input, fields: [...input.fields].reverse() },
      ])!;
      expect(restored.sources[0]!.read).toEqual(occurrence.read);
      expect(restored.operations[0]!.semanticDocument).toEqual(semanticDocument);
      const savedField = occurrence.read.fields.find(
        (field) => field.displayName === 'customer_id'
      )!;
      expect(
        session.referencingFields([savedField.fieldId], session.revision).length
      ).toBeGreaterThan(0);
      const sql = (await projectSubstraitToPostgresSql(document)).sql;
      expect(sql).toContain('customer_id AS c0');
      expect(sql).toContain('upper(i0.c0) AS c2');
    } finally {
      session.dispose();
    }
  });

  it.each(['reorder', 'alias', 'add', 'remove', 'type'] as const)(
    'validates published producer identities without rebuilding the local Read (%s)',
    (change) => {
      const producer = buildCanonicalTransform();
      let upstream = SOURCE;
      const consumer = { ...TRANSFORM, id: 'consumer' };
      const dependency = {
        ...EDGE,
        id: 'producer-consumer',
        sourceId: producer.id,
        targetId: consumer.id,
      };
      const resolve = (node: typeof producer): CanvasDvtCompositionInput =>
        resolveCanvasDvtCompositionInputs({
          nodes: [upstream, node, consumer],
          edges: [EDGE, dependency],
          targetNodeId: consumer.id,
        })[0]!;
      const occurrence = createPendingSourceOccurrence(resolve(producer));
      const otherOccurrence = createPendingSourceOccurrence(resolve(producer));
      const draft = createCanvasRelationalAuthoringDraft({
        sources: [occurrence, otherOccurrence],
        operations: [],
        outputRelationId: null,
        positions: new Map(),
      });
      const outputs = [
        { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
        { fieldId: 'output:customer', name: 'customer_name', sourceFieldName: 'customer' },
      ];
      if (change === 'reorder') outputs.reverse();
      if (change === 'alias') outputs[0]!.name = 'renamed_order';
      if (change === 'remove') outputs.pop();
      if (change === 'add')
        outputs.push({ fieldId: 'output:extra', name: 'extra', sourceFieldName: 'customer' });
      const physicalSource = resolveDvtSubstraitProjectionSource(SOURCE)!;
      const document = createDvtSubstraitProjectionDraft({
        source:
          change === 'type'
            ? {
                ...physicalSource,
                fields: physicalSource.fields.map((f) => ({ ...f, dataType: 'text' })),
              }
            : physicalSource,
        targetNodeId: producer.id,
        outputs,
      });
      const current = applyDvtSubstraitSemanticDocument(
        producer,
        encodeDvtSubstraitSemanticDocument(document)
      );
      if (change === 'type')
        upstream = {
          ...SOURCE,
          metadata: {
            ...SOURCE.metadata,
            columns: [
              { name: 'order_id', type: 'text' },
              { name: 'customer', type: 'text' },
            ],
          },
        };
      const restored = restoreCanvasRelationalAuthoringDraft(draft, [resolve(current)]);
      if (change === 'remove' || change === 'type') expect(restored).toBeNull();
      else {
        expect(restored?.sources[0]?.read).toEqual(occurrence.read);
        expect(restored?.sources[1]?.read).toEqual(otherOccurrence.read);
        const leftIds = new Set(restored!.sources[0]!.read.fields.map((f) => f.fieldId));
        expect(restored!.sources[1]!.read.fields.every((f) => !leftIds.has(f.fieldId))).toBe(true);
      }
    }
  );

  it.each([false, true])(
    'retires completed wiring without reviving it on save (disconnected: %s)',
    (disconnected) => {
      const { document, session } = graphJoin();
      const draft = {
        version: 'v1' as const,
        sources: [],
        operations: [],
        outputRelationId: disconnected ? null : session.rootId,
        positions: {},
      };
      const model = graphModel(document);
      model.metadata = { ...model.metadata, relationalAuthoringDraft: draft };
      const expected = disconnected ? draft : null;
      expect(readCanvasRelationalAuthoringDraft(model)).toEqual(expected);
      const inspector = createCanvasInspectorNodeDraft(model);
      expect(inspector.relationalAuthoringDraft ?? null).toEqual(expected);
      const saved = applyCanvasInspectorNodeDraft(model, inspector);
      expect(saved.metadata?.relationalAuthoringDraft ?? null).toEqual(expected);
    }
  );

  it('restores only work that is not already part of the applied semantic tree', () => {
    const { document, session } = graphJoin();
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const pendingId = 'pending-operation:aggregate';
    const restored = restoreCanvasRelationalAuthoringDraft(
      {
        version: 'v1',
        sources: [],
        operations: [
          {
            relationId: session.rootId,
            operation: 'inner_join',
            inputs: [...indexed.index.relations.get(session.rootId)!.inputs],
          },
          {
            relationId: pendingId,
            operation: 'aggregate',
            inputs: [session.rootId],
          },
        ],
        outputRelationId: pendingId,
        positions: {
          [session.rootId]: { x: 10, y: 20 },
          [pendingId]: { x: 30, y: 40 },
        },
      },
      [],
      document
    );

    expect(restored?.operations).toEqual([
      expect.objectContaining({ id: pendingId, inputs: [session.rootId] }),
    ]);
    expect(restored?.positions.size).toBe(2);
  });
});
