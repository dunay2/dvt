/** Canonical documents exported by the existing Canvas JOIN authoring path. */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
  type DvtSubstraitSemanticDocumentV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { buildDvtTerminalTransformPreviewDraft } from './workspaceGraphDraftFixture.js';

const documents = JSON.parse(
  readFileSync(
    new URL(
      '../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json',
      import.meta.url
    ),
    'utf8'
  )
) as Record<string, unknown>;

type JoinFixtureType =
  'inner' | 'left' | 'right' | 'outer' | 'left_semi' | 'left_anti' | 'right_semi' | 'right_anti';
export type SemiAntiPredicateScenario = 'equal' | 'composite' | 'nulls_equal' | 'less_than';

const SEMI_ANTI_TYPE: Readonly<
  Record<Exclude<JoinFixtureType, 'inner' | 'left' | 'right' | 'outer'>, number>
> = {
  left_semi: 5,
  left_anti: 6,
  right_semi: 8,
  right_anti: 9,
};

function semiAntiDocument(
  fixture: DvtSubstraitSemanticDocumentV1,
  joinType: number,
  predicateScenario: SemiAntiPredicateScenario
): DvtSubstraitSemanticDocumentV1 {
  const plan = decodeDvtSubstraitPlanV1(fixture);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'join') {
    throw new Error('JOIN preview fixture must contain a JOIN root.');
  }
  const join = root.value.input.relType.value;
  if (join.common?.emitKind.case !== 'emit' || join.expression?.rexType.case !== 'scalarFunction') {
    throw new Error('JOIN preview fixture must use explicit emit.');
  }
  const retainRight = joinType === 8 || joinType === 9;
  const retainedRelation = fixture.sidecar.relations.find(
    (relation) => relation.relAnchor === (retainRight ? 2 : 1)
  )!;
  const stage = fixture.sidecar.relations.find(
    (relation) => relation.relAnchor === join.common!.relAnchor
  )!;
  const retainedFields = fixture.sidecar.fields
    .filter((field) => field.relationId === retainedRelation.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const existingStageFieldId = new Map(
    fixture.sidecar.fields
      .filter((field) => field.relationId === stage.relationId)
      .map((field) => [field.sourceFieldId, field.fieldId] as const)
  );
  join.type = joinType;
  if (predicateScenario !== 'equal') {
    const equalExpression = globalThis.structuredClone(join.expression);
    const equalFunction = equalExpression.rexType;
    if (equalFunction.case !== 'scalarFunction') {
      throw new Error('JOIN preview fixture must use a scalar equality predicate.');
    }
    const selections = equalFunction.value.arguments.map((argument) => {
      if (argument.argType.case !== 'value') {
        throw new Error('JOIN preview fixture must use value arguments.');
      }
      return globalThis.structuredClone(argument.argType.value);
    });
    if (selections.length !== 2) {
      throw new Error('JOIN preview fixture must use a binary equality predicate.');
    }
    const selectionAt = (
      template: (typeof selections)[number],
      ordinal: number
    ): (typeof selections)[number] => {
      const selection = globalThis.structuredClone(template);
      const reference = selection.rexType;
      if (
        reference.case !== 'selection' ||
        reference.value.referenceType.case !== 'directReference' ||
        reference.value.referenceType.value.referenceType.case !== 'structField'
      ) {
        throw new Error('JOIN preview fixture must use direct field references.');
      }
      reference.value.referenceType.value.referenceType.value.field = ordinal;
      return selection;
    };
    const addFunction = (name: string, extensionUrnReference: number): number => {
      const template = plan.extensions.find((extension) => {
        const mapping = extension.mappingType;
        return (
          mapping.case === 'extensionFunction' &&
          mapping.value.extensionUrnReference === extensionUrnReference
        );
      });
      if (template?.mappingType.case !== 'extensionFunction') {
        throw new Error('JOIN preview fixture must declare comparison and boolean functions.');
      }
      const declaration = globalThis.structuredClone(template);
      const mapping = declaration.mappingType;
      if (mapping.case !== 'extensionFunction') {
        throw new Error('JOIN preview function declaration changed shape while cloning.');
      }
      const anchor =
        Math.max(
          ...plan.extensions.flatMap((extension) => {
            const mapping = extension.mappingType;
            return mapping.case === 'extensionFunction' ? [mapping.value.functionAnchor] : [];
          })
        ) + 1;
      mapping.value.functionAnchor = anchor;
      mapping.value.name = name;
      plan.extensions.push(declaration);
      return anchor;
    };
    const scalarExpression = (
      functionReference: number,
      operands: readonly (typeof selections)[number][],
      requiredOutput = false
    ): typeof equalExpression => {
      const expression = globalThis.structuredClone(equalExpression);
      const scalar = expression.rexType;
      if (scalar.case !== 'scalarFunction') {
        throw new Error('JOIN preview fixture must use scalar predicates.');
      }
      scalar.value.functionReference = functionReference;
      scalar.value.arguments = operands.map((operand, index) => {
        const argument = globalThis.structuredClone(
          equalFunction.value.arguments[Math.min(index, 1)]!
        );
        if (argument.argType.case !== 'value') {
          throw new Error('JOIN preview fixture must use value arguments.');
        }
        argument.argType.value = globalThis.structuredClone(operand);
        return argument;
      });
      if (requiredOutput && scalar.value.outputType?.kind.case === 'bool') {
        scalar.value.outputType.kind.value.nullability = 2;
      }
      return expression;
    };

    if (predicateScenario === 'less_than') {
      const equalDeclaration = plan.extensions.find(
        (extension) =>
          extension.mappingType.case === 'extensionFunction' &&
          extension.mappingType.value.functionAnchor === equalFunction.value.functionReference
      );
      if (equalDeclaration?.mappingType.case !== 'extensionFunction') {
        throw new Error('JOIN preview fixture must declare equality.');
      }
      equalDeclaration.mappingType.value.name = 'lt';
      if (join.left?.relType.case !== 'read' || join.right?.relType.case !== 'read') {
        throw new Error('JOIN preview fixture must contain two reads.');
      }
      const leftType = join.left.relType.value.baseSchema?.struct?.types[1];
      const rightType = join.right.relType.value.baseSchema?.struct?.types[0];
      if (leftType == null || rightType == null) {
        throw new Error('JOIN preview fixture must contain comparable key types.');
      }
      leftType.kind = {
        case: 'i64',
        value: {
          $typeName: 'substrait.Type.I64',
          typeVariationReference: 0,
          nullability: 1,
        },
      };
      rightType.kind = globalThis.structuredClone(leftType.kind);
    } else if (predicateScenario === 'composite') {
      const notEqual = addFunction('not_equal', 1);
      const second = scalarExpression(notEqual, [
        selectionAt(selections[0]!, 0),
        selectionAt(selections[1]!, 3),
      ]);
      join.expression = scalarExpression(2, [equalExpression, second]);
    } else {
      const isNull = addFunction('is_null', 1);
      const or = addFunction('or', 2);
      const leftNull = scalarExpression(isNull, [selections[0]!], true);
      const rightNull = scalarExpression(isNull, [selections[1]!], true);
      const bothNull = scalarExpression(2, [leftNull, rightNull]);
      join.expression = scalarExpression(or, [equalExpression, bothNull]);
    }
  }
  join.common.emitKind.value.outputMapping = retainedFields.map((_, ordinal) => ordinal);
  root.value.names = retainedFields.map((field) => field.displayName!);
  const semanticPlan = encodeDvtSubstraitPlanV1(plan);
  return DvtSubstraitSemanticDocumentV1Schema.parse({
    ...fixture,
    semanticPlan,
    sidecar: {
      ...fixture.sidecar,
      semanticPlanSha256: semanticPlan.sha256,
      fields: [
        ...fixture.sidecar.fields.filter((field) => field.relationId !== stage.relationId),
        ...retainedFields.map((field, outputOrdinal) => ({
          fieldId: existingStageFieldId.get(field.fieldId),
          relationId: stage.relationId,
          sourceFieldId: field.fieldId,
          outputOrdinal,
          displayName: field.displayName,
        })),
      ],
    },
  });
}

const THREE_INPUT_FINAL_JOIN_PLANS: Readonly<
  Record<
    Extract<JoinFixtureType, 'left' | 'right' | 'outer'>,
    Readonly<{ bytesBase64: string; sha256: string }>
  >
> = {
  left: {
    bytesBase64:
      'Eg0aCxABGgVlcXVhbCABEgsaCRACGgNhbmQgAhrxAhLuAgqyAjKvAgoLEgcKBQABAgMFKAUStAEysQEKChIGCgQAAQIDKAQSPAo6CgIoARIlCghvcmRlcl9pZAoJY2xpZW50X2lkEg4KBGICEAEKBGICEAEYAjoNCgNyYXcKBm9yZGVycxo7CjkKAigCEiQKCWNsaWVudF9pZAoHY291bnRyeRIOCgRiAhABCgRiAhABGAI6DQoDcmF3CgZjbGllbnQiJhokCAEaBAoCEAEiDBoKEggKBBICCAEiACIMGgoSCAoEEgIIAiIAMAEaQQo/CgIoAxIjCghvcmRlcl9pZAoHcHJvZHVjdBIOCgRiAhABCgRiAhABGAI6FAoDcmF3Cg1vcmRlcl9kZXRhaWxzIiQaIggBGgQKAhABIgoaCBIGCgISACIAIgwaChIICgQSAggEIgAwAxIIb3JkZXJfaWQSCWNsaWVudF9pZBIQY2xpZW50X2NsaWVudF9pZBIHY291bnRyeRIHcHJvZHVjdDIkEGUqIGR2dC12dHgyLW4taW5wdXQtaW5uZXItam9pbi1jYXJkQi8IARIrZXh0ZW5zaW9uOmlvLnN1YnN0cmFpdDpmdW5jdGlvbnNfY29tcGFyaXNvbkIsCAISKGV4dGVuc2lvbjppby5zdWJzdHJhaXQ6ZnVuY3Rpb25zX2Jvb2xlYW4=',
    sha256: '6ed7f3731ee600313e3c2705a57d24c78a6908fa8550f57de1b06292b0e0e4b7',
  },
  right: {
    bytesBase64:
      'Eg0aCxABGgVlcXVhbCABEgsaCRACGgNhbmQgAhrxAhLuAgqyAjKvAgoLEgcKBQABAgMFKAUStAEysQEKChIGCgQAAQIDKAQSPAo6CgIoARIlCghvcmRlcl9pZAoJY2xpZW50X2lkEg4KBGICEAEKBGICEAEYAjoNCgNyYXcKBm9yZGVycxo7CjkKAigCEiQKCWNsaWVudF9pZAoHY291bnRyeRIOCgRiAhABCgRiAhABGAI6DQoDcmF3CgZjbGllbnQiJhokCAEaBAoCEAEiDBoKEggKBBICCAEiACIMGgoSCAoEEgIIAiIAMAEaQQo/CgIoAxIjCghvcmRlcl9pZAoHcHJvZHVjdBIOCgRiAhABCgRiAhABGAI6FAoDcmF3Cg1vcmRlcl9kZXRhaWxzIiQaIggBGgQKAhABIgoaCBIGCgISACIAIgwaChIICgQSAggEIgAwBBIIb3JkZXJfaWQSCWNsaWVudF9pZBIQY2xpZW50X2NsaWVudF9pZBIHY291bnRyeRIHcHJvZHVjdDIkEGUqIGR2dC12dHgyLW4taW5wdXQtaW5uZXItam9pbi1jYXJkQi8IARIrZXh0ZW5zaW9uOmlvLnN1YnN0cmFpdDpmdW5jdGlvbnNfY29tcGFyaXNvbkIsCAISKGV4dGVuc2lvbjppby5zdWJzdHJhaXQ6ZnVuY3Rpb25zX2Jvb2xlYW4=',
    sha256: '256d3af82909a2fa6ac504c4aaaf06fbe5912f745f17176d44e6dbc52a97db39',
  },
  outer: {
    bytesBase64:
      'Eg0aCxABGgVlcXVhbCABEgsaCRACGgNhbmQgAhrxAhLuAgqyAjKvAgoLEgcKBQABAgMFKAUStAEysQEKChIGCgQAAQIDKAQSPAo6CgIoARIlCghvcmRlcl9pZAoJY2xpZW50X2lkEg4KBGICEAEKBGICEAEYAjoNCgNyYXcKBm9yZGVycxo7CjkKAigCEiQKCWNsaWVudF9pZAoHY291bnRyeRIOCgRiAhABCgRiAhABGAI6DQoDcmF3CgZjbGllbnQiJhokCAEaBAoCEAEiDBoKEggKBBICCAEiACIMGgoSCAoEEgIIAiIAMAEaQQo/CgIoAxIjCghvcmRlcl9pZAoHcHJvZHVjdBIOCgRiAhABCgRiAhABGAI6FAoDcmF3Cg1vcmRlcl9kZXRhaWxzIiQaIggBGgQKAhABIgoaCBIGCgISACIAIgwaChIICgQSAggEIgAwAhIIb3JkZXJfaWQSCWNsaWVudF9pZBIQY2xpZW50X2NsaWVudF9pZBIHY291bnRyeRIHcHJvZHVjdDIkEGUqIGR2dC12dHgyLW4taW5wdXQtaW5uZXItam9pbi1jYXJkQi8IARIrZXh0ZW5zaW9uOmlvLnN1YnN0cmFpdDpmdW5jdGlvbnNfY29tcGFyaXNvbkIsCAISKGV4dGVuc2lvbjppby5zdWJzdHJhaXQ6ZnVuY3Rpb25zX2Jvb2xlYW4=',
    sha256: '64240ca6cf37ebf0fdce40b6760c8c6ca6de83779081ced1d63a2fd4592d54f4',
  },
};

function withBinaryOuterJoinType(
  fixture: DvtSubstraitSemanticDocumentV1,
  joinType: Extract<JoinFixtureType, 'left' | 'right' | 'outer'>
): DvtSubstraitSemanticDocumentV1 {
  const plan = decodeDvtSubstraitPlanV1(fixture);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'join') {
    throw new Error('Binary outer JOIN fixture must contain one JoinRel root.');
  }
  root.value.input.relType.value.type = { outer: 2, left: 3, right: 4 }[joinType];
  const semanticPlan = encodeDvtSubstraitPlanV1(plan);
  return DvtSubstraitSemanticDocumentV1Schema.parse({
    ...fixture,
    semanticPlan,
    sidecar: { ...fixture.sidecar, semanticPlanSha256: semanticPlan.sha256 },
  });
}

export function buildDvtJoinPreviewDraft(
  inputCount: 2 | 3,
  finalJoinType: JoinFixtureType = 'inner',
  predicateScenario: SemiAntiPredicateScenario = 'equal'
): WorkspaceGraphAuthoringDraft {
  const base = buildDvtTerminalTransformPreviewDraft();
  const fixture = DvtSubstraitSemanticDocumentV1Schema.parse(
    documents[inputCount === 2 ? 'two' : 'three']
  );
  const semiAntiType =
    finalJoinType === 'left_semi' ||
    finalJoinType === 'left_anti' ||
    finalJoinType === 'right_semi' ||
    finalJoinType === 'right_anti'
      ? SEMI_ANTI_TYPE[finalJoinType]
      : null;
  if (semiAntiType != null && inputCount !== 2) {
    throw new Error('The semi/anti preview fixture is a two-input retained-side proof.');
  }
  const override =
    finalJoinType === 'left' || finalJoinType === 'right' || finalJoinType === 'outer'
      ? THREE_INPUT_FINAL_JOIN_PLANS[finalJoinType]
      : undefined;
  const semanticDocument =
    semiAntiType != null
      ? semiAntiDocument(fixture, semiAntiType, predicateScenario)
      : inputCount === 2 &&
          (finalJoinType === 'left' || finalJoinType === 'right' || finalJoinType === 'outer')
        ? withBinaryOuterJoinType(fixture, finalJoinType)
        : inputCount === 3 && override != null
          ? DvtSubstraitSemanticDocumentV1Schema.parse({
              ...fixture,
              semanticPlan: { ...fixture.semanticPlan, ...override },
              sidecar: {
                ...fixture.sidecar,
                semanticPlanSha256: override.sha256,
              },
            })
          : fixture;
  const sources = semanticDocument.sidecar.relations.flatMap((relation) => {
    if (relation.sourceRef === undefined) return [];
    return [
      {
        ...base.nodes[0]!,
        id: `source-${relation.displayName}`,
        name: relation.displayName!,
        metadata: {
          schema: 'raw',
          tableName: relation.displayName,
          connectedSourceRef: relation.sourceRef,
          columns: semanticDocument.sidecar.fields
            .filter((field) => field.relationId === relation.relationId)
            .map((field) => ({ name: field.displayName!, type: 'text' })),
        },
      },
    ];
  });
  const transform = {
    ...base.nodes[1]!,
    name: 'Orders + Client + Details',
    metadata: { transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument } },
  };
  const nodes = [...sources, transform];
  return {
    ...base,
    nodes,
    nodeIds: nodes.map((node) => node.id),
    nodePositions: Object.fromEntries(
      nodes.map((node, index) => [node.id, { x: index * 240, y: 0 }])
    ),
    edges: sources.map((source) => ({
      id: `${source.id}-transform`,
      sourceId: source.id,
      targetId: transform.id,
      relation: 'lineage',
    })),
  };
}

type SemanticRel = NonNullable<
  Extract<
    ReturnType<typeof decodeDvtSubstraitPlanV1>['relations'][number]['relType'],
    { case: 'root' }
  >['value']['input']
>;

function replaceJoinsWithCross(rel: SemanticRel): SemanticRel {
  if (rel.relType.case === 'read') return rel;
  if (rel.relType.case !== 'join') throw new Error('CROSS fixture expects ReadRel/JoinRel only.');
  const join = rel.relType.value;
  if (join.left == null || join.right == null)
    throw new Error('CROSS fixture expects binary JOIN.');
  return {
    $typeName: 'substrait.Rel',
    relType: {
      case: 'cross',
      value: {
        $typeName: 'substrait.CrossRel',
        common: join.common,
        left: replaceJoinsWithCross(join.left),
        right: replaceJoinsWithCross(join.right),
      },
    },
  };
}

export function buildDvtCrossPreviewDraft(inputCount: 2 | 3): WorkspaceGraphAuthoringDraft {
  const draft = buildDvtJoinPreviewDraft(inputCount);
  return {
    ...draft,
    nodes: draft.nodes.map((node) => {
      if (node.id !== 'transform-orders') return node;
      const authority = node.metadata?.['transformAuthoring'];
      const parsed = DvtSubstraitSemanticDocumentV1Schema.parse(
        typeof authority === 'object' && authority != null && 'semanticDocument' in authority
          ? authority.semanticDocument
          : undefined
      );
      const plan = decodeDvtSubstraitPlanV1(parsed);
      const root = plan.relations[0]?.relType;
      if (root?.case !== 'root' || root.value.input == null) {
        throw new Error('CROSS fixture expects a RootRel input.');
      }
      root.value.input = replaceJoinsWithCross(root.value.input);
      const semanticPlan = encodeDvtSubstraitPlanV1(plan);
      return {
        ...node,
        metadata: {
          ...node.metadata,
          transformAuthoring: {
            version: 'v1',
            mode: 'substrait',
            semanticDocument: {
              ...parsed,
              semanticPlan,
              sidecar: { ...parsed.sidecar, semanticPlanSha256: semanticPlan.sha256 },
            },
          },
        },
      };
    }),
  };
}

export function buildDvtOuterJoinCrossPreviewDraft(): WorkspaceGraphAuthoringDraft {
  const draft = buildDvtJoinPreviewDraft(3);
  return {
    ...draft,
    nodes: draft.nodes.map((node) => {
      if (node.id !== 'transform-orders') return node;
      const authority = node.metadata?.['transformAuthoring'];
      const parsed = DvtSubstraitSemanticDocumentV1Schema.parse(
        typeof authority === 'object' && authority != null && 'semanticDocument' in authority
          ? authority.semanticDocument
          : undefined
      );
      const plan = decodeDvtSubstraitPlanV1(parsed);
      const root = plan.relations[0]?.relType;
      if (root?.case !== 'root' || root.value.input?.relType.case !== 'join') {
        throw new Error('Mixed CROSS fixture expects a final JoinRel.');
      }
      const finalJoin = root.value.input.relType.value;
      if (finalJoin.left?.relType.case !== 'join' || finalJoin.right == null) {
        throw new Error('Mixed CROSS fixture expects a left-associated JoinRel.');
      }
      // Substrait v0.101.0 JoinType.JOIN_TYPE_LEFT.
      finalJoin.left.relType.value.type = 3;
      root.value.input = {
        $typeName: 'substrait.Rel',
        relType: {
          case: 'cross',
          value: {
            $typeName: 'substrait.CrossRel',
            common: finalJoin.common,
            left: finalJoin.left,
            right: finalJoin.right,
          },
        },
      };
      const semanticPlan = encodeDvtSubstraitPlanV1(plan);
      return {
        ...node,
        metadata: {
          ...node.metadata,
          transformAuthoring: {
            version: 'v1',
            mode: 'substrait',
            semanticDocument: {
              ...parsed,
              semanticPlan,
              sidecar: { ...parsed.sidecar, semanticPlanSha256: semanticPlan.sha256 },
            },
          },
        },
      };
    }),
  };
}
