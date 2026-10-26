import { describe, expect, it } from 'vitest';
import {
  indexSubstraitRelations,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { createSourceJoin } from './canvasSourceJoin';
import { source } from './canvasRelationalOperator.test-support';
import { initializeCanvasSourceOutputs } from './canvasSourceOutputDefaults';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { createSourceSet } from './canvasSourceSet';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import {
  createPendingSourceOccurrence,
  type PendingSourceOccurrence,
} from './relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { configureCanvasStagedComposition } from './canvasStagedCompositionConfiguration';
import { createCanvasStagedOperation, connectCanvasStagedOperation } from './canvasStagedOperation';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

function fixture(): { document: SubstraitDocument; reads: readonly IndexedRelation[] } {
  const document = createSourceJoin({
    left: { source: source('client'), fields: ['id', 'country'] },
    right: { source: source('orders'), fields: ['id', 'amount'] },
    leftFieldName: 'id',
    rightFieldName: 'id',
    targetNodeId: 'model',
  });
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw new Error('Invalid fixture');
  const reads = [...indexed.index.relations.values()]
    .filter((entry) => entry.relation.relType.case === 'read')
    .sort((left, right) => left.binding.relAnchor - right.binding.relAnchor);
  return { document, reads };
}

function pending(
  read: IndexedRelation,
  initialOutputFieldIds: readonly string[]
): PendingSourceOccurrence {
  if (read.binding.displayName == null) throw new Error('Expected a named Source occurrence.');
  return {
    sourceNodeId: read.binding.producerRef?.nodeId ?? read.binding.displayName,
    read: { ...read, binding: { ...read.binding, displayName: read.binding.displayName } },
    initialOutputFieldIds,
  };
}

describe('pending Source terminal Output initialization', () => {
  it('materializes the producer publication default for a newly dropped partial physical Source', async () => {
    const inputs: CanvasDvtCompositionInput[] = ['client', 'orders'].map((name) => {
      const input = source(name);
      return {
        ...input,
        fields: input.fields.map((field) => ({
          name: field.name,
          dataType: 'text',
          joinDataType: field.type,
        })),
      };
    });
    inputs[0] = {
      ...inputs[0]!,
      inputBindings: {
        version: 'v1',
        fields: [{ inputId: 'published-name', producerFieldId: 'name' }],
      },
    };
    const sources = inputs.map(createPendingSourceOccurrence);
    const excluded = sources[0]!.read.fields[0]!.fieldId;
    const included = sources[0]!.read.fields[1]!.fieldId;
    expect(sources[0]!.initialOutputFieldIds).toEqual([included]);
    let operation = createCanvasStagedOperation('inner_join');
    operation = connectCanvasStagedOperation(operation, 0, sources[0]!.read.binding.relationId);
    operation = connectCanvasStagedOperation(operation, 1, sources[1]!.read.binding.relationId);
    const configured = configureCanvasStagedComposition(operation, inputs, sources, [operation]);
    expect(configured.semanticDocument).toBeDefined();
    const document = decodeDvtSubstraitSemanticDocument(configured.semanticDocument!);
    const result = await initializeCanvasSourceOutputs({ document, sources });
    const oracle = new CanvasRelationAnalysisSession('publication-default-oracle');
    try {
      oracle.receive(result.document);
      const output = await oracle.query(null);
      expect(output.fields).toHaveLength(3);
      expect(output.bindings.some((field) => field.sourceFieldId === excluded)).toBe(false);
      expect(output.bindings.some((field) => field.sourceFieldId === included)).toBe(true);
      expect(oracle.locate(sources[0]!.read.binding.relationId, oracle.revision).relation).toEqual(
        sources[0]!.read.relation
      );
    } finally {
      oracle.dispose();
    }
  });

  it('selects the occurrence contribution only at the root, retaining Reads and ON', async () => {
    const { document, reads } = fixture();
    const read = reads[0]!;
    const initialized = await initializeCanvasSourceOutputs({
      document,
      sources: [pending(read, [read.fields[0]!.fieldId])],
    });
    const session = new CanvasRelationAnalysisSession('result');
    session.receive(initialized.document);
    expect(
      (await session.query(null)).bindings
        .filter((field) => field.parentFieldId == null)
        .map((field) => field.displayName)
    ).toEqual(['id', 'orders_id_2', 'amount']);
    expect(initialized.consumedIds).toEqual([read.binding.relationId]);
    const before = document.plan.relations[0]!.relType;
    const after = initialized.document.plan.relations[0]!.relType;
    if (
      before.case !== 'root' ||
      after.case !== 'root' ||
      before.value.input?.relType.case !== 'join' ||
      after.value.input?.relType.case !== 'join'
    )
      throw new Error('Expected JOIN');
    expect(after.value.input.relType.value.left).toEqual(before.value.input.relType.value.left);
    expect(after.value.input.relType.value.right).toEqual(before.value.input.relType.value.right);
    expect(after.value.input.relType.value.expression).toEqual(
      before.value.input.relType.value.expression
    );
    session.dispose();
  });

  it('does not consume preferences of unrelated Sources and honours cancellation', async () => {
    const { document } = fixture();
    const other = fixture().reads[0]!;
    expect(
      (await initializeCanvasSourceOutputs({ document, sources: [pending(other, [])] })).consumedIds
    ).toEqual([]);
    const controller = new AbortController();
    controller.abort();
    await expect(
      initializeCanvasSourceOutputs({ document, sources: [], signal: controller.signal })
    ).rejects.toThrow();
  });

  it('applies independent preferences at the terminal of a nested JOIN without narrowing the intermediate JOIN', async () => {
    const initial = fixture();
    const preparation = new CanvasRelationAnalysisSession('nested-terminal-preparation');
    try {
      preparation.receive(initial.document);
      const input = source('shipping');
      const current = await preparation.query(null);
      const document = await composeSourceRelation(preparation, {
        relationId: preparation.rootId,
        expectedRevision: preparation.revision,
        operation: 'inner_join',
        predicate: {
          leftSourceFieldId: current.bindings[0]!.fieldId,
          rightFieldName: 'customer_id',
        },
        input: {
          ...input,
          fields: input.fields.map((field) => ({
            name: field.name,
            dataType: 'text',
            joinDataType: field.type,
          })),
        },
      });
      const before = indexSubstraitRelations(document);
      if (!before.ok) throw before.error;
      const intermediateId = before.index.relations.get(before.index.rootId)!.inputs[0]!;
      expect((await preparation.query(intermediateId)).fields).toHaveLength(4);
      const left = before.index.relations.get(initial.reads[0]!.binding.relationId)!;
      const right = before.index.relations.get(initial.reads[1]!.binding.relationId)!;
      const sources = [pending(left, [left.fields[1]!.fieldId]), pending(right, [])];
      const original = globalThis.structuredClone(document);
      const result = await initializeCanvasSourceOutputs({ document, sources });
      const after = indexSubstraitRelations(result.document);
      if (!after.ok) throw after.error;
      const oracle = new CanvasRelationAnalysisSession('nested-terminal-oracle');
      try {
        oracle.receive(result.document);
        expect((await oracle.query(null)).bindings.map((field) => field.displayName)).toEqual([
          'country',
          'customer_id',
          'name',
        ]);
        expect((await oracle.query(intermediateId)).fields).toHaveLength(4);
        for (const [id, entry] of before.index.relations) {
          const actual = after.index.relations.get(id)!;
          if (id !== before.index.rootId) {
            expect(actual.relation).toEqual(entry.relation);
            expect(actual.fields).toEqual(entry.fields);
          }
          if (entry.relation.relType.case === 'join') {
            if (actual.relation.relType.case !== 'join') throw new Error('Expected retained JOIN.');
            expect(actual.relation.relType.value.expression).toEqual(
              entry.relation.relType.value.expression
            );
          }
        }
        expect(result.consumedIds).toEqual(
          sources.map((occurrence) => occurrence.read.binding.relationId)
        );
        expect(document).toEqual(original);
        expect(sources[0]!.read.relation).toEqual(left.relation);
        expect(sources[1]!.initialOutputFieldIds).toEqual([]);
      } finally {
        oracle.dispose();
      }
    } finally {
      preparation.dispose();
    }
  });

  it('keeps self-JOIN preferences independent when both occurrences publish the same names', async () => {
    const input = source('client');
    const document = createSourceJoin({
      left: { source: input, fields: ['customer_id', 'name'] },
      right: { source: input, fields: ['customer_id', 'name'] },
      leftFieldName: 'customer_id',
      rightFieldName: 'customer_id',
      targetNodeId: 'model',
    });
    const before = indexSubstraitRelations(document);
    if (!before.ok) throw before.error;
    const reads = [...before.index.relations.values()]
      .filter((entry) => entry.relation.relType.case === 'read')
      .sort((left, right) => left.binding.relAnchor - right.binding.relAnchor);
    const retained = before.index.relations
      .get(before.index.rootId)!
      .fields.find((field) => field.sourceFieldId === reads[1]!.fields[1]!.fieldId)!;
    const sources = [pending(reads[0]!, []), pending(reads[1]!, [reads[1]!.fields[1]!.fieldId])];
    const result = await initializeCanvasSourceOutputs({ document, sources });
    const oracle = new CanvasRelationAnalysisSession('self-join-terminal');
    try {
      oracle.receive(result.document);
      expect((await oracle.query(null)).bindings.map((field) => field.fieldId)).toEqual([
        retained.fieldId,
      ]);
      expect((await oracle.query(null)).bindings.map((field) => field.displayName)).toEqual([
        retained.displayName,
      ]);
      expect(oracle.locate(reads[0]!.binding.relationId, oracle.revision).relation).toEqual(
        reads[0]!.relation
      );
      expect(oracle.locate(reads[1]!.binding.relationId, oracle.revision).relation).toEqual(
        reads[1]!.relation
      );
      expect(result.consumedIds).toEqual(reads.map((entry) => entry.binding.relationId));
    } finally {
      oracle.dispose();
    }
  });

  it.each([
    { kind: 'set', preference: 'empty' },
    { kind: 'set', preference: 'partial' },
    { kind: 'set', preference: 'complete' },
    { kind: 'aggregate', preference: 'empty' },
    { kind: 'aggregate', preference: 'partial' },
    { kind: 'aggregate', preference: 'complete' },
  ] as const)(
    'retains $kind output when initializing a $preference Source preference',
    async ({ kind, preference }) => {
      const preparation = new CanvasRelationAnalysisSession('shared-output-preparation');
      try {
        let document: SubstraitDocument;
        if (kind === 'set')
          document = createSourceSet({
            inputs: [source('left'), source('right')],
            targetNodeId: 'model',
          });
        else {
          preparation.receive(connectedNamesProjectionDraft());
          const input = await preparation.query(null);
          document = await applySelectedRelationAggregate(preparation, {
            relationId: preparation.rootId,
            expectedRevision: preparation.revision,
            intent: 'insert',
            fieldId: input.bindings[0]!.fieldId,
            alias: 'population',
          });
        }
        const before = indexSubstraitRelations(document);
        if (!before.ok) throw before.error;
        const read = [...before.index.relations.values()].find(
          (entry) => entry.relation.relType.case === 'read'
        )!;
        const selected =
          preference === 'complete'
            ? read.fields
                .filter((field) => field.parentFieldId == null)
                .map((field) => field.fieldId)
            : preference === 'partial'
              ? [read.fields[0]!.fieldId]
              : [];
        const sources = [pending(read, selected)];
        const snapshot = globalThis.structuredClone({ document, sources });
        if (preference === 'complete') {
          const initialized = await initializeCanvasSourceOutputs({ document, sources });
          expect(initialized.document).toBe(document);
          expect(initialized.consumedIds).toEqual([read.binding.relationId]);
        } else {
          await expect(initializeCanvasSourceOutputs({ document, sources })).rejects.toThrow(
            'independent direct contribution'
          );
        }
        expect({ document, sources }).toEqual(snapshot);
        expect(sources[0]!.initialOutputFieldIds).toEqual(selected);
      } finally {
        preparation.dispose();
      }
    }
  );

  it('preserves scalar and identity-copy definitions when excluding their forwarded Source field', async () => {
    const preparation = new CanvasRelationAnalysisSession('calculation-default-preparation');
    try {
      preparation.receive(connectedNamesProjectionDraft());
      await applySelectedRelationDerivedOutput(preparation, {
        relationId: preparation.rootId,
        expectedRevision: preparation.revision,
        intent: 'edit',
        alias: 'upper_name',
        formula: 'UPPER(first_name)',
      });
      const document = await applySelectedRelationDerivedOutput(preparation, {
        relationId: preparation.rootId,
        expectedRevision: preparation.revision,
        intent: 'edit',
        alias: 'identity_copy',
        formula: 'first_name',
      });
      const before = indexSubstraitRelations(document);
      if (!before.ok) throw before.error;
      const read = [...before.index.relations.values()].find(
        (entry) => entry.relation.relType.case === 'read'
      )!;
      const kept = read.fields.find((field) => field.displayName === 'last_name')!;
      const result = await initializeCanvasSourceOutputs({
        document,
        sources: [pending(read, [kept.fieldId])],
      });
      const after = indexSubstraitRelations(result.document);
      if (!after.ok) throw after.error;
      const oracle = new CanvasRelationAnalysisSession('calculation-default-oracle');
      try {
        oracle.receive(result.document);
        expect((await oracle.query(null)).bindings.map((field) => field.displayName)).toEqual([
          'last_name',
          'upper_name',
          'identity_copy',
        ]);
        for (const [id, entry] of before.index.relations) {
          const actual = after.index.relations.get(id)!;
          if (entry.relation.relType.case === 'read')
            expect(actual.relation).toEqual(entry.relation);
          if (entry.relation.relType.case !== 'project') continue;
          if (actual.relation.relType.case !== 'project')
            throw new Error('Expected retained Project.');
          expect(actual.relation.relType.value.expressions).toEqual(
            entry.relation.relType.value.expressions
          );
        }
        for (const alias of ['upper_name', 'identity_copy']) {
          const definition = document.sidecar.fields.find((field) => field.displayName === alias)!;
          const actual = result.document.sidecar.fields.find(
            (field) => field.fieldId === definition.fieldId
          );
          expect(actual).toMatchObject({
            fieldId: definition.fieldId,
            displayName: alias,
          });
          expect(actual?.sourceFieldId).toBe(definition.sourceFieldId);
          expect(actual?.operandFieldIds).toEqual(definition.operandFieldIds);
        }
      } finally {
        oracle.dispose();
      }
    } finally {
      preparation.dispose();
    }
  });

  it('permits omitting an unavailable Source field while retaining an admitted direct output', async () => {
    const { document, reads } = fixture();
    const read = reads[0]!;
    const result = await initializeCanvasSourceOutputs({
      document,
      sources: [pending(read, [read.fields[0]!.fieldId])],
      deniedInputs: new Set([read.fields[1]!.fieldId]),
    });
    const oracle = new CanvasRelationAnalysisSession('denied-default-oracle');
    try {
      oracle.receive(result.document);
      expect((await oracle.query(null)).bindings.map((field) => field.displayName)).toEqual([
        'id',
        'orders_id_2',
        'amount',
      ]);
      expect(oracle.locate(read.binding.relationId, oracle.revision).relation).toEqual(
        read.relation
      );
    } finally {
      oracle.dispose();
    }
  });
  it('does not consume a complete default after publication authority revokes a field', async () => {
    const { document, reads } = fixture();
    const read = reads[0]!;
    const sources = [
      pending(
        read,
        read.fields.filter((field) => field.parentFieldId == null).map((field) => field.fieldId)
      ),
    ];
    await expect(
      initializeCanvasSourceOutputs({
        document,
        sources,
        deniedInputs: new Set([read.fields[0]!.fieldId]),
      })
    ).rejects.toThrow();
    expect(sources[0]!.initialOutputFieldIds).toHaveLength(2);
  });
});
