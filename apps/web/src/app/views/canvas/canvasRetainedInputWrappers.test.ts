/**
 * Owned concern: prove retained configuration survives only exact-producer unary wrapping.
 * @baseline ADR-0064: relation and field identity outlive Canvas topology gestures.
 * @decision Replay authored wrappers with exact function identities and reject ambiguous lineage.
 * @consequence Reconnection cannot silently regenerate a JOIN or publish a partial document.
 * @version 1.1.0
 */
import { describe, expect, it } from 'vitest';
import { create } from '@bufbuild/protobuf';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  indexSubstraitRelations,
  type IndexedRelation,
  type SubstraitDocument,
  type SubstraitRelationIndex,
} from '@dvt/substrait-analysis';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { graphJoin } from './canvasRelationGraph.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import {
  projectCanvasStagedDocument,
  decodeCanvasStagedOperation,
  resolveCanvasStagedProducerDocument,
} from './canvasStagedOperationDocument';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { restoreCanvasRetainedInputWrappers } from './canvasRetainedInputWrappers';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import {
  dvtSubstraitTextComparison,
  type DvtSubstraitTextComparisonOperator,
} from './canvasDvtSubstraitTextComparison';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { resolveFunctionReference } from '@dvt/postgres-projection';
import { projectCanvasCanonicalGraphEditing } from './canvasCanonicalGraphEditing';
import { canvasCanonicalProducerIdentity } from './canvasCanonicalProducerIdentity';
import documents from '../../../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json';

type WrapperOperation = 'sort' | 'fetch' | DvtSubstraitTextComparisonOperator;

function index(document: SubstraitDocument): SubstraitRelationIndex {
  const result = indexSubstraitRelations(document);
  if (!result.ok) throw result.error;
  return result.index;
}

async function wrap(
  document: SubstraitDocument,
  operations: readonly WrapperOperation[]
): Promise<SubstraitDocument> {
  const session = new CanvasRelationAnalysisSession('retained-input');
  // These fixture operands are raw Reads: drop unused JOIN declarations to exercise anchor collisions.
  const source = {
    ...document,
    plan: { ...document.plan, extensions: [], extensionUrns: [] },
  };
  session.receive(source);
  try {
    let result: SubstraitDocument = source;
    for (const operation of operations) {
      const schema = await session.query(session.rootId);
      const request = {
        intent: 'insert' as const,
        relationId: session.rootId,
        expectedRevision: session.revision,
      };
      if (operation !== 'sort' && operation !== 'fetch') {
        result = await applySelectedRelationFilter(session, {
          ...request,
          fieldId: schema.bindings[1]!.fieldId,
          capabilityId: dvtSubstraitTextComparison.capabilities.find(
            (capability) => capability.operator === operation
          )!.capabilityId,
          value: 'Selected only',
        });
        continue;
      }
      result = await applySelectedRelationSortFetch(session, {
        ...request,
        ...(operation === 'sort'
          ? ({
              operation: 'sort',
              keys: [
                {
                  fieldId: schema.bindings[0]!.fieldId,
                  direction: SortField_SortDirection.DESC_NULLS_FIRST,
                },
              ],
            } as const)
          : ({ operation: 'fetch', offset: 1n, count: 9n } as const)),
      });
    }
    return result;
  } finally {
    session.dispose();
  }
}

async function scenario(
  port: number,
  operations: readonly WrapperOperation[] = ['sort', 'fetch']
): Promise<{
  document: SubstraitDocument;
  root: IndexedRelation;
  producers: SubstraitDocument[];
  operation: CanvasStagedOperation;
}> {
  const { document, session } = graphJoin();
  const root = session.locate(session.rootId, session.revision);
  session.dispose();
  const producers = root.inputs.map((id) => projectCanvasStagedDocument(document, id)!);
  producers[port] = await wrap(producers[port]!, operations);
  return {
    document,
    root,
    producers,
    operation: {
      id: root.binding.relationId,
      operation: 'inner_join' as const,
      inputs: producers.map((producer) => index(producer).rootId),
      configurationDocument: encodeDvtSubstraitSemanticDocument(document),
    },
  };
}

describe('retained input wrapper restoration', () => {
  it('ignores only emitter metadata when comparing unchanged producer semantics', () => {
    const document = decodeDvtSubstraitSemanticDocument(documents.two);
    const original = structuredClone(document);
    const candidate = structuredClone(document);
    candidate.plan.version!.producer = 'dvt-canvas';
    const before = structuredClone(candidate);
    const identity = canvasCanonicalProducerIdentity(document);
    expect(identity).not.toBeNull();
    expect(canvasCanonicalProducerIdentity(candidate)).toBe(identity);
    expect(candidate).toEqual(before);
    candidate.plan.version!.gitHash = 'a'.repeat(40);
    expect(canvasCanonicalProducerIdentity(candidate)).not.toBe(identity);
    expect(document).toEqual(original);
  });

  it('restores imported JOIN inputs rebuilt through the pending-source resolver', async () => {
    const document = decodeDvtSubstraitSemanticDocument(documents.two);
    const original = index(document);
    const root = original.relations.get(original.rootId)!;
    const graph = projectCanvasCanonicalGraphEditing(document, ['orders', 'client'])!;
    const producers = await Promise.all(
      root.inputs.map((id) =>
        wrap(resolveCanvasStagedProducerDocument({ ...graph, relationId: id, canonical: null })!, [
          'equal',
          'sort',
          'fetch',
        ])
      )
    );
    const operation: CanvasStagedOperation = {
      id: root.binding.relationId,
      operation: 'inner_join',
      inputs: producers.map((producer) => index(producer).rootId),
      configurationDocument: encodeDvtSubstraitSemanticDocument(document),
    };
    const before = structuredClone({ document, operation, producers });
    const restored = decodeCanvasStagedOperation(
      await restoreCanvasRetainedInputWrappers(operation, producers)
    );
    expect(restored).not.toBeNull();
    const result = index(restored!);
    expect(result.rootId).toBe(root.binding.relationId);
    expect(result.relations.get(result.rootId)!.inputs).toEqual(operation.inputs);
    expect(restored!.plan.version).toEqual(document.plan.version);
    expect({ document, operation, producers }).toEqual(before);
  });

  it.each(
    [0, 1].flatMap((port) =>
      ([['sort'], ['sort', 'fetch'], ['not_equal'], ['not_equal', 'sort', 'fetch']] as const).map(
        (operations) => ({ port, operations })
      )
    )
  )(
    'retains JOIN identity and output contract on port $port through $operations',
    async ({ port, operations }) => {
      const sample = await scenario(port, operations);
      const filter = [...index(sample.producers[port]!).relations.values()].find(
        (entry) => entry.relation.relType.case === 'filter'
      );
      if (filter?.relation.relType.case === 'filter') {
        const scalar = filter.relation.relType.value.condition!.rexType;
        if (scalar.case !== 'scalarFunction') throw new Error('Expected scalar Filter');
        const output = scalar.value.outputType;
        if (output?.kind.case !== 'bool') throw new Error('Expected boolean comparison');
        output.kind.value.nullability = Type_Nullability.REQUIRED;
        const join = sample.root.relation.relType;
        if (join.case !== 'join' || join.value.expression?.rexType.case !== 'scalarFunction')
          throw new Error('Expected scalar JOIN');
        expect(scalar.value.functionReference).toBe(
          join.value.expression.rexType.value.functionReference
        );
        expect(
          resolveFunctionReference(sample.producers[port]!.plan, scalar.value.functionReference)
        ).not.toEqual(
          resolveFunctionReference(sample.document.plan, scalar.value.functionReference)
        );
      }
      const before = encodeDvtSubstraitSemanticDocument(sample.document);
      const producerSnapshots = structuredClone(sample.producers);
      const restored = await restoreCanvasRetainedInputWrappers(sample.operation, sample.producers);
      const document = decodeCanvasStagedOperation(restored)!;
      expect(document).not.toBeNull();
      const result = index(document);
      const root = result.relations.get(result.rootId)!;
      expect(result.rootId).toBe(sample.root.binding.relationId);
      expect(root.inputs).toEqual(sample.operation.inputs);
      expect(root.fields.map(({ sourceFieldId: _, ...field }) => field)).toEqual(
        sample.root.fields.map(({ sourceFieldId: _, ...field }) => field)
      );
      expect(root.relation.relType.case).toBe('join');
      if (root.relation.relType.case === 'join' && sample.root.relation.relType.case === 'join') {
        expect(root.relation.relType.value.expression).toEqual(
          sample.root.relation.relType.value.expression
        );
        expect(root.relation.relType.value.type).toBe(sample.root.relation.relType.value.type);
      }
      if (filter == null) {
        expect(document.plan.extensions).toEqual(sample.document.plan.extensions);
        expect(document.plan.extensionUrns).toEqual(sample.document.plan.extensionUrns);
      }
      for (const entry of index(sample.producers[port]!).relations.values()) {
        const replayed = result.relations.get(entry.binding.relationId)!;
        expect(replayed.fields).toEqual(entry.fields);
        expect(replayed.binding).toEqual({
          ...entry.binding,
          relAnchor: replayed.binding.relAnchor,
        });
        if (
          entry.relation.relType.case === 'filter' &&
          replayed.relation.relType.case === 'filter'
        ) {
          const expected = entry.relation.relType.value.condition!.rexType;
          const actual = replayed.relation.relType.value.condition!.rexType;
          if (expected.case !== 'scalarFunction' || actual.case !== 'scalarFunction')
            throw new Error('Expected scalar Filter');
          expect({ ...actual.value, functionReference: expected.value.functionReference }).toEqual(
            expected.value
          );
          expect(
            resolveFunctionReference(document.plan, actual.value.functionReference)
          ).toMatchObject({
            ok: true,
            value: { name: 'not_equal' },
          });
        }
      }
      expect(result.relations.get(sample.root.inputs[1 - port]!)!.relation).toEqual(
        index(sample.document).relations.get(sample.root.inputs[1 - port]!)!.relation
      );
      expect(encodeDvtSubstraitSemanticDocument(sample.document)).toEqual(before);
      expect(sample.producers).toEqual(producerSnapshots);
      expect(restored.configurationDocument).toBeUndefined();
    }
  );

  it('accumulates distinct Filter functions across both ports without replacing JOIN declarations', async () => {
    const sample = await scenario(0, ['not_equal']);
    sample.producers[1] = await wrap(sample.producers[1]!, ['gt']);
    const operation = {
      ...sample.operation,
      inputs: sample.producers.map((producer) => index(producer).rootId),
    };
    const before = structuredClone({
      operation,
      producers: sample.producers,
      document: sample.document,
    });
    const restored = await restoreCanvasRetainedInputWrappers(operation, sample.producers);
    const document = decodeCanvasStagedOperation(restored)!;
    expect(document).not.toBeNull();
    const result = index(document);
    expect(result.rootId).toBe(sample.root.binding.relationId);
    expect(document.plan.extensions.slice(0, sample.document.plan.extensions.length)).toEqual(
      sample.document.plan.extensions
    );
    for (const [port, operator] of ['not_equal', 'gt'].entries()) {
      const filter = result.relations.get(operation.inputs[port]!)!.relation.relType;
      if (filter.case !== 'filter') throw new Error('Expected Filter on each port');
      expect(
        dvtSubstraitTextComparison.inspect(document.plan, filter.value.condition)
      ).toMatchObject({
        operator,
        sourceOrdinal: 1,
        value: 'Selected only',
      });
    }
    expect({ operation, producers: sample.producers, document: sample.document }).toEqual(before);
  });

  it.each([
    'unknown-function',
    'dangling-function',
    'out-of-range',
    'non-string',
    'options',
    'literal',
    'missing-condition',
  ])('rejects a second-port Filter with %s atomically', async (mutation) => {
    const sample = await scenario(0, ['not_equal', 'sort', 'fetch']);
    const candidate = await wrap(sample.producers[1]!, ['gt']);
    const root = index(candidate).relations.get(index(candidate).rootId)!;
    if (root.relation.relType.case !== 'filter') throw new Error('Expected Filter');
    const filter = root.relation.relType.value;
    const scalar = filter.condition!.rexType;
    if (scalar.case !== 'scalarFunction') throw new Error('Expected scalar Filter');
    const changes: Record<string, () => void> = {
      'unknown-function': () => {
        const declaration = candidate.plan.extensions[0]!.mappingType;
        if (declaration.case === 'extensionFunction') declaration.value.name = 'unknown';
      },
      'dangling-function': () => {
        scalar.value.functionReference = 999;
      },
      'out-of-range': () => {
        scalar.value.arguments[0]!.argType = {
          case: 'value',
          value: dvtSubstraitExpression.field(2),
        };
      },
      'non-string': () => {
        for (const document of [sample.document, candidate]) {
          const read = index(document).relations.get(sample.root.inputs[1]!)!.relation.relType;
          if (read.case === 'read')
            read.value.baseSchema!.struct!.types[1] = create(TypeSchema, {
              kind: { case: 'i64', value: { nullability: Type_Nullability.NULLABLE } },
            });
        }
      },
      options: () => {
        scalar.value.options.push({
          $typeName: 'substrait.FunctionOption',
          name: 'unsupported',
          preference: ['x'],
        });
      },
      literal: () => {
        scalar.value.arguments[1]!.argType = {
          case: 'value',
          value: dvtSubstraitExpression.literal({ dataType: 'i64', value: 1n }),
        };
      },
      'missing-condition': () => {
        filter.condition = undefined;
      },
    };
    changes[mutation]!();
    const producers = [sample.producers[0]!, candidate];
    const operation = {
      ...sample.operation,
      inputs: producers.map((producer) => index(producer).rootId),
      configurationDocument: encodeDvtSubstraitSemanticDocument(sample.document),
    };
    const before = structuredClone({ operation, producers, document: sample.document });
    const restored = await restoreCanvasRetainedInputWrappers(operation, producers);
    expect(restored).toBe(operation);
    expect(restored.semanticDocument).toBeUndefined();
    expect({ operation, producers, document: sample.document }).toEqual(before);
  });

  it.each([
    'origin',
    'lineage',
    'alias',
    'emit',
    'root',
    'type',
    'nullability',
    'comparison',
    'negative-fetch',
    'empty-sort',
    'duplicate-sort',
  ])('keeps configuration pending for changed %s', async (mutation) => {
    const sample = await scenario(0);
    const candidate = structuredClone(sample.producers[0]!);
    const indexed = index(candidate);
    const root = indexed.relations.get(indexed.rootId)!;
    const origin = indexed.relations.get(sample.root.inputs[0]!)!;
    const sort = [...indexed.relations.values()].find(
      (entry) => entry.relation.relType.case === 'sort'
    )!.relation.relType;
    const changes: Record<string, () => void> = {
      comparison: () => {
        if (sort.case === 'sort')
          sort.value.sorts[0]!.sortKind = { case: 'comparisonFunctionReference', value: 999 };
      },
      'negative-fetch': () => {
        if (root.relation.relType.case === 'fetch') {
          const literal = root.relation.relType.value.countExpr!.rexType;
          if (literal.case === 'literal') literal.value.literalType = { case: 'i64', value: -1n };
        }
      },
      'empty-sort': () => {
        if (sort.case === 'sort') sort.value.sorts = [];
      },
      'duplicate-sort': () => {
        if (sort.case === 'sort') sort.value.sorts.push(structuredClone(sort.value.sorts[0]!));
      },
      origin: () => {
        origin.binding.displayName = 'other producer';
      },
      lineage: () => {
        root.fields[0]!.sourceFieldId = root.fields[1]!.sourceFieldId;
      },
      alias: () => {
        root.fields[0]!.displayName = 'renamed';
      },
      emit: () => {
        if (root.relation.relType.case === 'fetch')
          root.relation.relType.value.common!.emitKind = {
            case: 'emit',
            value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: [1, 0] },
          };
      },
      root: () => {
        root.binding.relationId = sample.operation.id;
      },
      type: () => {
        if (origin.relation.relType.case === 'read')
          origin.relation.relType.value.baseSchema!.struct!.types[0] = create(TypeSchema, {
            kind: { case: 'i64', value: { nullability: Type_Nullability.NULLABLE } },
          });
      },
      nullability: () => {
        if (origin.relation.relType.case === 'read') {
          const type = origin.relation.relType.value.baseSchema!.struct!.types[0]!;
          if (type.kind.case === 'string') type.kind.value.nullability = Type_Nullability.REQUIRED;
        }
      },
    };
    changes[mutation]!();
    const restored = await restoreCanvasRetainedInputWrappers(sample.operation, [
      candidate,
      sample.producers[1]!,
    ]);
    expect(restored).toBe(sample.operation);
    expect(restored.semanticDocument).toBeUndefined();
  });

  it('does not publish the valid first port if the second port is missing', async () => {
    const sample = await scenario(0);
    expect(
      await restoreCanvasRetainedInputWrappers(sample.operation, [sample.producers[0]!, null])
    ).toBe(sample.operation);
  });

  it('does not restore a retained document after the JOIN intent changes', async () => {
    const sample = await scenario(0);
    const operation = { ...sample.operation, operation: 'left_join' as const };
    expect(await restoreCanvasRetainedInputWrappers(operation, sample.producers)).toBe(operation);
  });
});
