import {
  ExpressionSchema,
  JoinRel_JoinType,
  type Rel,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import { relationsFixture } from '../../substrait-analysis/test/relationsFixture.js';

export const field = (ordinal: number): Expression =>
  create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: {
        rootType: { case: 'rootReference', value: {} },
        referenceType: {
          case: 'directReference',
          value: { referenceType: { case: 'structField', value: { field: ordinal } } },
        },
      },
    },
  });
export const integer = (value: bigint): Expression =>
  create(ExpressionSchema, {
    rexType: { case: 'literal', value: { literalType: { case: 'i64', value } } },
  });
export const comparison = (reference: number, left: number, right: number | bigint): Expression =>
  create(ExpressionSchema, {
    rexType: {
      case: 'scalarFunction',
      value: {
        functionReference: reference,
        arguments: [field(left), typeof right === 'bigint' ? integer(right) : field(right)].map(
          (value) => ({ argType: { case: 'value', value } })
        ),
        outputType: { kind: { case: 'bool', value: { nullability: Type_Nullability.NULLABLE } } },
      },
    },
  });

export function compositionalFixture(
  kind: 'join' | 'cross' | 'set',
  joinType = JoinRel_JoinType.INNER,
  calculated = false
): SubstraitDocument {
  const grammar = relationsFixture();
  const branch = (reference: number, threshold: bigint): Rel => {
    const read = grammar.read();
    if (read.relType.case === 'read')
      read.relType.value.baseSchema!.struct!.types[0]!.kind = {
        case: 'i64',
        value: {
          $typeName: 'substrait.Type.I64',
          nullability: Type_Nullability.NULLABLE,
          typeVariationReference: 0,
        },
      };
    const filter = grammar.unary('filter', read);
    if (filter.relType.case === 'filter')
      filter.relType.value.condition = comparison(reference, 0, threshold);
    const project = grammar.unary('project', filter, [1]);
    if (project.relType.case === 'project')
      project.relType.value.expressions = [calculated ? comparison(1, 0, 1n) : field(0)];
    return project;
  };
  const retained = [
    JoinRel_JoinType.LEFT_SEMI,
    JoinRel_JoinType.LEFT_ANTI,
    JoinRel_JoinType.RIGHT_SEMI,
    JoinRel_JoinType.RIGHT_ANTI,
  ].includes(joinType);
  const root = grammar.combine(
    kind,
    [branch(3, 3n), branch(1, 1n)],
    kind === 'set' || retained ? [0] : [0, 1]
  );
  if (root.relType.case === 'join') {
    root.relType.value.type = joinType;
    root.relType.value.expression = comparison(2, 0, 1);
  }
  const document = grammar.document(root);
  document.plan.extensionUrns.push({
    $typeName: 'substrait.extensions.SimpleExtensionURN',
    extensionUrnAnchor: 1,
    urn: 'extension:io.substrait:functions_comparison',
  });
  for (const [functionAnchor, name] of [
    [1, 'gt'],
    [2, 'equal'],
    [3, 'lt'],
  ] as const)
    document.plan.extensions.push({
      $typeName: 'substrait.extensions.SimpleExtensionDeclaration',
      mappingType: {
        case: 'extensionFunction',
        value: {
          $typeName: 'substrait.extensions.SimpleExtensionDeclaration.ExtensionFunction',
          extensionUrnReference: 1,
          functionAnchor,
          name,
        },
      },
    });
  for (const binding of document.sidecar.relations.filter(
    (binding) => binding.relAnchor === 1 || binding.relAnchor === 4
  ))
    binding.sourceRef = {
      schemaVersion: 'connected-source-ref.v1',
      sourceObjectId: 'physical-items',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse',
      },
    };
  return document;
}
