/**
 * Owned concern: prove retained configuration survives only exact-producer unary wrapping.
 * @baseline ADR-0064: relation and field identity outlive Canvas topology gestures.
 * @decision Exercise canonical commands and reject changed origins or ambiguous lineage.
 * @consequence Reconnection cannot silently regenerate a JOIN or publish a partial document.
 * @version 1.0.0
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
} from './canvasStagedOperationDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { restoreCanvasRetainedInputWrappers } from './canvasRetainedInputWrappers';

function index(document: SubstraitDocument): SubstraitRelationIndex {
  const result = indexSubstraitRelations(document);
  if (!result.ok) throw result.error;
  return result.index;
}

async function wrap(document: SubstraitDocument, count: number): Promise<SubstraitDocument> {
  const session = new CanvasRelationAnalysisSession('retained-input');
  session.receive(document);
  try {
    let result = document;
    for (let layer = 0; layer < count; layer++) {
      const schema = await session.query(session.rootId);
      result = await applySelectedRelationSortFetch(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        ...(layer === 0
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
  layers = 2
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
  producers[port] = await wrap(producers[port]!, layers);
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
  it.each([
    [0, 1],
    [0, 2],
    [1, 1],
    [1, 2],
  ])(
    'retains JOIN identity and output contract on port %s through %s layers',
    async (port, layers) => {
      const sample = await scenario(port!, layers!);
      const before = encodeDvtSubstraitSemanticDocument(sample.document);
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
      expect(document.plan.extensions).toEqual(sample.document.plan.extensions);
      expect(document.plan.extensionUrns).toEqual(sample.document.plan.extensionUrns);
      expect(result.relations.get(sample.root.inputs[1 - port!]!)!.relation).toEqual(
        index(sample.document).relations.get(sample.root.inputs[1 - port!]!)!.relation
      );
      expect(encodeDvtSubstraitSemanticDocument(sample.document)).toEqual(before);
      expect(restored.configurationDocument).toBeUndefined();
    }
  );

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
