import { describe, expect, it } from 'vitest';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { configureCanvasStagedBinary } from './canvasStagedBinaryConfiguration';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceDocument } from './canvasSourceDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { graphJoin } from './canvasRelationGraph.test-support';
import { source } from './canvasRelationalOperator.test-support';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import {
  resolveDvtSubstraitColumnFunctions,
  resolveFunctionReference,
} from '@dvt/postgres-projection';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import {
  assignCanvasStagedRoot,
  resolveCanvasStagedProducerDocument,
} from './canvasStagedOperationDocument';

const input: CanvasDvtCompositionInput = {
  nodeId: 'places-source',
  schema: 'public',
  table: 'places',
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1',
    sourceObjectId: 'public.places',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      provider: 'postgres',
      connectionId: 'warehouse',
    },
  },
  fields: [
    { id: 'places-id', name: 'id', dataType: 'bigint', joinDataType: 'i64', nullable: false },
    {
      id: 'places-parent-id',
      name: 'parent_id',
      dataType: 'bigint',
      joinDataType: 'i64',
      nullable: true,
    },
  ],
};

describe('staged binary configuration', () => {
  it.each([
    'inner_join',
    'left_join',
    'right_join',
    'full_outer_join',
    'left_semi_join',
    'right_semi_join',
    'left_anti_join',
    'right_anti_join',
    'cross_join',
    'union_all',
    'union_distinct',
    'intersect_distinct',
    'except_distinct',
    'intersect_all',
    'except_all',
  ] as const)('configures %s from two transformed producers', async (operation) => {
    const sources = [createPendingSourceOccurrence(input), createPendingSourceOccurrence(input)];
    const producers = await Promise.all(
      sources.map((pending, port) =>
        configureCanvasStagedTransform(
          {
            id: `pending-operation:transform-${port}`,
            operation: 'field_transform',
            inputs: [pending.read.binding.relationId],
          },
          createSourceDocument([pending.read], pending.read)
        )
      )
    );
    expect(producers.every((producer) => producer.semanticDocument != null)).toBe(true);
    const configured = configureCanvasStagedBinary(
      {
        id: 'pending-operation:binary',
        operation,
        inputs: producers.map((producer) => producer.id),
      },
      [input],
      sources,
      producers
    );
    const document = decodeCanvasStagedOperation(configured);
    expect(document).not.toBeNull();
    for (const producer of producers)
      expect(
        document?.sidecar.relations.some((relation) => relation.relationId === producer.id)
      ).toBe(true);
    expect(document?.sidecar.relations).toHaveLength(5);
    const indexed = indexSubstraitRelations(document!);
    expect(indexed.ok && indexed.index.relations.get(configured.id)?.inputs).toEqual(
      producers.map((producer) => producer.id)
    );
    expect(
      producers.map((producer) =>
        encodeDvtSubstraitSemanticDocument(decodeCanvasStagedOperation(producer)!)
      )
    ).toEqual(producers.map((producer) => producer.semanticDocument));
  });
  it('preserves different functions with colliding local anchors on both producers', async () => {
    const textInput: CanvasDvtCompositionInput = {
      ...input,
      fields: [
        { id: 'name', name: 'name', dataType: 'text', joinDataType: 'string', nullable: false },
      ],
    };
    const capabilities = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['string'],
      provider: 'postgres',
      resolution: 'complete',
    });
    const producers = await Promise.all(
      (['trim', 'upper'] as const).map(async (name) => {
        const pending = createPendingSourceOccurrence(textInput);
        const session = new CanvasRelationAnalysisSession(name);
        try {
          session.receive(createSourceDocument([pending.read], pending.read));
          const document = await applySelectedRelationDerivedOutput(session, {
            relationId: session.rootId,
            expectedRevision: session.revision,
            intent: 'insert',
            alias: name,
            capabilityIds: [capabilities.find((entry) => entry.name === name)!.capabilityId],
            operandFieldIds: [pending.read.fields[0]!.fieldId],
          });
          return {
            id: name,
            operation: 'field_transform' as const,
            inputs: [pending.read.binding.relationId],
            semanticDocument: encodeDvtSubstraitSemanticDocument(
              assignCanvasStagedRoot(document, name)
            ),
          };
        } finally {
          session.dispose();
        }
      })
    );
    const before = producers.map((producer) => JSON.stringify(producer.semanticDocument));
    const configured = configureCanvasStagedBinary(
      {
        id: 'joined-functions',
        operation: 'inner_join',
        inputs: producers.map((producer) => producer.id),
      },
      [textInput],
      [],
      producers
    );
    const document = decodeCanvasStagedOperation(configured)!;
    expect(document).not.toBeNull();
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    for (const producer of producers) {
      const project = indexed.index.relations.get(producer.id)!.relation.relType;
      if (project.case !== 'project') throw new Error('Expected a preserved ProjectRel.');
      const expression = project.value.expressions.at(-1)!.rexType;
      if (expression.case !== 'scalarFunction')
        throw new Error('Expected preserved scalar expression.');
      const identity = resolveFunctionReference(document.plan, expression.value.functionReference);
      expect(identity.ok && identity.value.name).toBe(producer.id + ':str');
      expect(document.sidecar.fields.filter((field) => field.relationId === producer.id)).toEqual(
        decodeCanvasStagedOperation(producer)!.sidecar.fields.filter(
          (field) => field.relationId === producer.id
        )
      );
    }
    expect(producers.map((producer) => JSON.stringify(producer.semanticDocument))).toEqual(before);
  });

  it('resolves the exact canonical subtree rather than copying its consumer or sibling', () => {
    const { document, session } = graphJoin();
    try {
      const relationId = session.locate(session.rootId, session.revision).inputs[0]!;
      const subtree = resolveCanvasStagedProducerDocument({
        relationId,
        canonical: document,
        operations: [],
        sources: [],
      });
      expect(subtree?.sidecar.relations.map((binding) => binding.relationId)).toEqual([relationId]);
      expect(subtree?.sidecar.fields.every((field) => field.relationId === relationId)).toBe(true);
    } finally {
      session.dispose();
    }
  });

  it.each(['duplicate', 'connection', 'set-schema'] as const)(
    'rejects %s operands without publishing partial semantics',
    (reason) => {
      const left = createPendingSourceOccurrence(input);
      const rightInput: CanvasDvtCompositionInput =
        reason === 'connection'
          ? {
              ...input,
              sourceRef: {
                ...input.sourceRef!,
                connectionRef: { ...input.sourceRef!.connectionRef, connectionId: 'other' },
              },
            }
          : reason === 'set-schema'
            ? { ...input, fields: input.fields.slice(0, 1) }
            : input;
      const right = reason === 'duplicate' ? left : createPendingSourceOccurrence(rightInput);
      const operation = {
        id: 'invalid',
        operation: reason === 'set-schema' ? ('union_all' as const) : ('inner_join' as const),
        inputs: [left.read.binding.relationId, right.read.binding.relationId],
      };
      expect(configureCanvasStagedBinary(operation, [input, rightInput], [left, right], [])).toBe(
        operation
      );
    }
  );
  it('keeps two occurrences of the same producer distinct in a self-join', () => {
    const left = createPendingSourceOccurrence(input);
    const createdRight = createPendingSourceOccurrence(input);
    const right = {
      ...createdRight,
      read: {
        ...createdRight.read,
        binding: { ...createdRight.read.binding, displayName: 'places 2' },
      },
    };
    const configured = configureCanvasStagedBinary(
      {
        id: 'pending-operation:self-join',
        operation: 'inner_join',
        inputs: [left.read.binding.relationId, right.read.binding.relationId],
      },
      [input],
      [left, right],
      []
    );
    const document = decodeCanvasStagedOperation(configured);
    const reads = document?.sidecar.relations.filter(
      (binding) => binding.sourceRef != null || binding.producerRef != null
    );

    expect(reads?.map((binding) => binding.relationId)).toEqual([
      left.read.binding.relationId,
      right.read.binding.relationId,
    ]);
    expect(reads?.map((binding) => binding.displayName)).toEqual(['places', 'places 2']);
    expect(document?.sidecar.relations.at(-1)?.relationId).toBe(configured.id);
  });

  it('drops stale semantics as soon as one Input is disconnected', () => {
    const pending = configureCanvasStagedBinary(
      {
        id: 'pending-operation:join',
        operation: 'inner_join',
        inputs: ['left', null],
        semanticDocument: {} as never,
      },
      [input],
      [],
      []
    );

    expect(pending.semanticDocument).toBeUndefined();
  });

  it('configures equality from one canonical Read and one pending producer', () => {
    const canonical = createPendingSourceOccurrence(input);
    const pending = createPendingSourceOccurrence(input);
    const document = createSourceDocument([canonical.read], canonical.read);
    const session = new CanvasRelationAnalysisSession('staged-join-test');
    session.receive(document);
    const configured = configureCanvasStagedBinary(
      {
        id: 'pending-operation:mixed-join',
        operation: 'inner_join',
        inputs: [canonical.read.binding.relationId, pending.read.binding.relationId],
      },
      [input],
      [pending],
      [],
      document
    );

    expect(decodeCanvasStagedOperation(configured)).not.toBeNull();
    session.dispose();
  });

  it.each([0, 1] as const)(
    'configures a transformed producer on port %i without flattening its tree',
    async (richPort) => {
      const rich = graphJoin();
      const next = source('next');
      const nextInput: CanvasDvtCompositionInput = {
        ...next,
        fields: next.fields.map((field) => ({
          name: field.name,
          dataType: field.type,
          joinDataType: field.type,
        })),
      };
      const pending = createPendingSourceOccurrence(nextInput);
      const inputs = [nextInput];
      const operation = {
        id: `pending-operation:composed-${richPort}`,
        operation: 'inner_join' as const,
        inputs:
          richPort === 0
            ? [rich.session.rootId, pending.read.binding.relationId]
            : [pending.read.binding.relationId, rich.session.rootId],
      };
      const configured = configureCanvasStagedBinary(
        operation,
        inputs,
        [pending],
        [operation],
        rich.document
      );
      const document = decodeCanvasStagedOperation(configured);

      expect(document?.sidecar.relations.at(-1)?.relationId).toBe(operation.id);
      expect(
        document?.sidecar.relations.some((relation) => relation.relationId === rich.session.rootId)
      ).toBe(true);
      expect(document?.sidecar.relations).toHaveLength(rich.document.sidecar.relations.length + 2);
      rich.session.dispose();
    }
  );
});
