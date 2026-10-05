import { describe, expect, it } from 'vitest';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { configureCanvasStagedComposition } from './canvasStagedCompositionConfiguration';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceDocument } from './canvasSourceDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { graphJoin } from './canvasRelationGraph.test-support';
import { source } from './canvasRelationalOperator.test-support';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { indexSubstraitRelations, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import { mergeCanvasCompositionOperands } from './canvasCompositionOperands';
import { rebindCanvasUnionComposition } from './canvasRetainedUnionComposition';
import {
  resolveDvtSubstraitColumnFunctions,
  resolveFunctionReference,
} from '@dvt/postgres-projection';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import {
  connectCanvasStagedOperation,
  disconnectCanvasStagedOperation,
} from './canvasStagedOperation';
import {
  assignCanvasStagedRoot,
  resolveCanvasStagedProducerDocument,
} from './canvasStagedOperationDocument';

const input: CanvasDvtCompositionInput = {
  ...source('places'),
  nodeId: 'places-source',
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

describe('staged composition configuration', () => {
  it.each(['identity', 'schema'] as const)(
    'rejects retained UNION with incompatible %s without publishing partial semantics',
    (reason) => {
      const thirdInput: CanvasDvtCompositionInput =
        reason === 'schema'
          ? {
              ...input,
              fields: [
                { ...input.fields[0]!, dataType: 'text', joinDataType: 'string' },
                input.fields[1]!,
              ],
            }
          : input;
      const sources = [input, input, thirdInput].map(createPendingSourceOccurrence);
      const ids = sources.map((source) => source.read.binding.relationId);
      const configured = configureCanvasStagedComposition(
        { id: 'union', operation: 'union_all', inputs: ids.slice(0, 2) },
        [input],
        sources,
        []
      );
      expect(configured.semanticDocument).toBeDefined();
      let pending = connectCanvasStagedOperation(configured, 2, ids[2]!);
      if (reason === 'identity') {
        pending = {
          ...pending,
          configurationDocument: encodeDvtSubstraitSemanticDocument(
            assignCanvasStagedRoot(
              decodeDvtSubstraitSemanticDocument(pending.configurationDocument!),
              'another-union'
            )
          ),
        };
        const merged = mergeCanvasCompositionOperands(
          sources.map((source) => createSourceDocument([source.read], source.read))
        );
        const rebind = (): ReturnType<typeof rebindCanvasUnionComposition> =>
          rebindCanvasUnionComposition(pending, merged);
        expect(rebind).toThrowError(SubstraitAnalysisError);
        expect(rebind).toThrowError(
          expect.objectContaining({
            code: 'invalid_binding',
            relationId: pending.id,
          })
        );
      }
      const before = JSON.stringify({ pending, sources });
      expect(configureCanvasStagedComposition(pending, [input, thirdInput], sources, [])).toBe(
        pending
      );
      expect(pending.semanticDocument).toBeUndefined();
      expect(JSON.stringify({ pending, sources })).toBe(before);
    }
  );
  it.each(['union_all', 'union_distinct'] as const)(
    'retains selected output identity and aliases when extending and reducing %s',
    async (operation) => {
      const sources = Array.from({ length: 4 }, () => createPendingSourceOccurrence(input));
      const ids = sources.map((source) => source.read.binding.relationId);
      let configured = configureCanvasStagedComposition(
        { id: 'union', operation, inputs: ids.slice(0, 2) },
        [input],
        sources,
        []
      );
      const session = new CanvasRelationAnalysisSession('union');
      try {
        session.receive(decodeCanvasStagedOperation(configured)!);
        const selected = await changeSelectedRelationOutputs(session, {
          relationId: 'union',
          expectedRevision: session.revision,
          outputs: [{ slot: 1, alias: 'selected_parent' }],
        });
        configured = {
          ...configured,
          semanticDocument: encodeDvtSubstraitSemanticDocument(selected),
        };
        const field = selected.sidecar.fields.find((entry) => entry.relationId === 'union')!;
        for (const port of [2, 3]) {
          configured = configureCanvasStagedComposition(
            connectCanvasStagedOperation(configured, port, ids[port]!),
            [input],
            sources,
            []
          );
          expect(configured.semanticDocument).toBeDefined();
        }
        configured = configureCanvasStagedComposition(
          disconnectCanvasStagedOperation(configured, 1),
          [input],
          sources,
          []
        );
        const document = decodeCanvasStagedOperation(configured)!;
        const indexed = indexSubstraitRelations(document);
        expect(indexed.ok && indexed.index.relations.get('union')?.inputs).toEqual([
          ids[0],
          ids[2],
          ids[3],
        ]);
        const outputs = document.sidecar.fields.filter((entry) => entry.relationId === 'union');
        expect(outputs).toHaveLength(1);
        expect(outputs[0]).toMatchObject({
          fieldId: field.fieldId,
          displayName: 'selected_parent',
        });
        expect(outputs[0]!.operandFieldIds).toEqual(
          [sources[0], sources[2], sources[3]].map((source) => source!.read.fields[1]!.fieldId)
        );
      } finally {
        session.dispose();
      }
    }
  );
  it.each([
    ['union_all', 'shared'],
    ['union_all', 'distinct'],
    ['union_distinct', 'shared'],
    ['union_distinct', 'distinct'],
  ] as const)(
    'configures one %s with three ordered occurrences of %s physical sources',
    (operation, provenance) => {
      const inputs = Array.from({ length: 3 }, (_, ordinal) =>
        provenance === 'shared'
          ? input
          : {
              ...input,
              nodeId: `places-${ordinal}`,
              table: `places_${ordinal}`,
              sourceRef: { ...input.sourceRef!, sourceObjectId: `public.places_${ordinal}` },
            }
      );
      const sources = inputs.map(createPendingSourceOccurrence);
      const ids = sources.map((source) => source.read.binding.relationId);
      const configured = configureCanvasStagedComposition(
        { id: 'union', operation, inputs: ids },
        inputs,
        sources,
        []
      );
      const document = decodeCanvasStagedOperation(configured);
      expect(document).not.toBeNull();
      const indexed = indexSubstraitRelations(document!);
      expect(indexed.ok && indexed.index.relations.get('union')?.inputs).toEqual(ids);
      expect(document!.sidecar.relations).toHaveLength(4);
      expect(
        document!.sidecar.relations
          .filter((binding) => binding.sourceRef != null)
          .map((binding) => binding.sourceRef)
      ).toEqual(inputs.map((entry) => entry.sourceRef));
    }
  );
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
    const configured = configureCanvasStagedComposition(
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
    const configured = configureCanvasStagedComposition(
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
      expect(
        configureCanvasStagedComposition(operation, [input, rightInput], [left, right], [])
      ).toBe(operation);
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
    const configured = configureCanvasStagedComposition(
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
    const pending = configureCanvasStagedComposition(
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
    const configured = configureCanvasStagedComposition(
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
      const configured = configureCanvasStagedComposition(
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
