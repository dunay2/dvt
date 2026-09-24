import {
  ExpressionSchema,
  type Expression,
  type Expression_ScalarFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { encodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import { relationsFixture } from '../../substrait-analysis/test/relationsFixture.js';

import { field } from './relationalSqlFixture.js';

export const textLiteral = (value: string): Expression =>
  create(ExpressionSchema, {
    rexType: { case: 'literal', value: { literalType: { case: 'string', value } } },
  });
export const scalar = (reference: number, args: Expression[]): Expression =>
  create(ExpressionSchema, {
    rexType: {
      case: 'scalarFunction',
      value: {
        functionReference: reference,
        arguments: args.map((value) => ({ argType: { case: 'value', value } })),
        outputType: { kind: { case: 'string', value: { nullability: Type_Nullability.NULLABLE } } },
      },
    },
  });

export function scalarFixture(temporal = false): {
  document: SubstraitDocument;
  fn: Expression_ScalarFunction;
} {
  const grammar = relationsFixture();
  const read = grammar.read();
  if (read.relType.case !== 'read') throw new Error('Expected Read');
  read.relType.value.baseSchema!.struct!.types = [
    create(TypeSchema, {
      kind: temporal
        ? {
            case: 'precisionTimestampTz',
            value: { precision: 3, nullability: Type_Nullability.NULLABLE },
          }
        : { case: 'string', value: { nullability: Type_Nullability.NULLABLE } },
    }),
  ];
  const concat = scalar(1, [field(0), textLiteral('!')]);
  if (concat.rexType.case !== 'scalarFunction') throw new Error('Expected scalar');
  concat.rexType.value.options = [
    { $typeName: 'substrait.FunctionOption', name: 'null_handling', preference: ['ACCEPT_NULLS'] },
  ];
  const expression = temporal
    ? create(ExpressionSchema, {
        rexType: {
          case: 'scalarFunction',
          value: {
            functionReference: 5,
            arguments: [
              { argType: { case: 'enum', value: 'YEAR' } },
              { argType: { case: 'value', value: field(0) } },
              { argType: { case: 'value', value: textLiteral('UTC') } },
            ],
            outputType: {
              kind: { case: 'i64', value: { nullability: Type_Nullability.NULLABLE } },
            },
          },
        },
      })
    : concat;
  const project = grammar.unary('project', read, temporal ? [1] : [1, 2, 3]);
  if (project.relType.case !== 'project') throw new Error('Expected Project');
  project.relType.value.expressions = temporal
    ? [expression]
    : [
        expression,
        scalar(2, [scalar(3, [concat])]),
        scalar(4, [field(0), textLiteral('fallback')]),
      ];
  const document = grammar.document(project);
  document.sidecar.relations[0]!.sourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    sourceObjectId: 'items',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse',
      provider: 'postgres',
    },
  };
  for (const [extensionUrnAnchor, family] of [
    [1, 'functions_string'],
    [2, 'functions_comparison'],
    [3, 'functions_datetime'],
  ] as const)
    document.plan.extensionUrns.push({
      $typeName: 'substrait.extensions.SimpleExtensionURN',
      extensionUrnAnchor,
      urn: `extension:io.substrait:${family}`,
    });
  for (const [functionAnchor, name, extensionUrnReference] of [
    [1, 'concat:str', 1],
    [2, 'upper:str', 1],
    [3, 'trim:str', 1],
    [4, 'coalesce:any1', 2],
    [5, 'extract:req_ptstz_str', 3],
  ] as const)
    document.plan.extensions.push({
      $typeName: 'substrait.extensions.SimpleExtensionDeclaration',
      mappingType: {
        case: 'extensionFunction',
        value: {
          $typeName: 'substrait.extensions.SimpleExtensionDeclaration.ExtensionFunction',
          functionAnchor,
          name,
          extensionUrnReference,
        },
      },
    });
  document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
  return { document, fn: expression.rexType.value as Expression_ScalarFunction };
}
