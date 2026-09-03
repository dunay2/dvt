import { create } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_LiteralSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  Expression_ScalarFunctionSchema,
  FunctionArgumentSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  SimpleExtensionDeclarationSchema,
  SimpleExtensionDeclaration_ExtensionFunctionSchema,
  SimpleExtensionURNSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/extensions/extensions_pb.js';
import {
  TypeSchema,
  Type_BooleanSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { buildDvtSubstraitStandardCapabilityId } from '@dvt/contracts';

const URN = 'extension:io.substrait:functions_comparison';
const EQUAL_ID = buildDvtSubstraitStandardCapabilityId('scalar-function', {
  sourceKind: 'simple-extension',
  urn: URN,
  name: 'equal',
});

function fieldReference(ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: create(Expression_FieldReferenceSchema, {
        referenceType: {
          case: 'directReference',
          value: create(Expression_ReferenceSegmentSchema, {
            referenceType: {
              case: 'structField',
              value: create(Expression_ReferenceSegment_StructFieldSchema, { field: ordinal }),
            },
          }),
        },
        rootType: {
          case: 'rootReference',
          value: create(Expression_FieldReference_RootReferenceSchema, {}),
        },
      }),
    },
  });
}

function ensureFunction(plan: Plan): Readonly<{ functionAnchor: number; urnAnchor: number }> {
  let urn = plan.extensionUrns.find((entry) => entry.urn === URN);
  if (urn == null) {
    urn = create(SimpleExtensionURNSchema, {
      extensionUrnAnchor:
        Math.max(0, ...plan.extensionUrns.map((entry) => entry.extensionUrnAnchor)) + 1,
      urn: URN,
    });
    plan.extensionUrns.push(urn);
  }
  const existing = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.extensionUrnReference === urn.extensionUrnAnchor &&
      entry.mappingType.value.name === 'equal'
  );
  if (existing?.mappingType.case === 'extensionFunction') {
    return {
      functionAnchor: existing.mappingType.value.functionAnchor,
      urnAnchor: urn.extensionUrnAnchor,
    };
  }
  const functionAnchor =
    Math.max(
      0,
      ...plan.extensions.flatMap((entry) =>
        entry.mappingType.case === 'extensionFunction'
          ? [entry.mappingType.value.functionAnchor]
          : []
      )
    ) + 1;
  plan.extensions.push(
    create(SimpleExtensionDeclarationSchema, {
      mappingType: {
        case: 'extensionFunction',
        value: create(SimpleExtensionDeclaration_ExtensionFunctionSchema, {
          extensionUrnReference: urn.extensionUrnAnchor,
          functionAnchor,
          name: 'equal',
        }),
      },
    })
  );
  return { functionAnchor, urnAnchor: urn.extensionUrnAnchor };
}

type EqualityInspection = Readonly<{
  sourceOrdinal: number;
  value: string;
  functionAnchor: number;
  urnAnchor: number;
}>;

export const dvtSubstraitTextEquality = {
  capabilityId: EQUAL_ID,
  create(plan: Plan, sourceOrdinal: number, value: string): Expression {
    const { functionAnchor } = ensureFunction(plan);
    const literal = create(ExpressionSchema, {
      rexType: {
        case: 'literal',
        value: create(Expression_LiteralSchema, {
          literalType: { case: 'string', value },
        }),
      },
    });
    return create(ExpressionSchema, {
      rexType: {
        case: 'scalarFunction',
        value: create(Expression_ScalarFunctionSchema, {
          functionReference: functionAnchor,
          arguments: [
            create(FunctionArgumentSchema, {
              argType: { case: 'value', value: fieldReference(sourceOrdinal) },
            }),
            create(FunctionArgumentSchema, { argType: { case: 'value', value: literal } }),
          ],
          outputType: create(TypeSchema, {
            kind: {
              case: 'bool',
              value: create(Type_BooleanSchema, { nullability: Type_Nullability.NULLABLE }),
            },
          }),
        }),
      },
    });
  },
  inspect(plan: Plan, expression: Expression | undefined): EqualityInspection | null {
    if (expression?.rexType.case !== 'scalarFunction') return null;
    const scalar = expression.rexType.value;
    const declaration = plan.extensions.find(
      (entry) =>
        entry.mappingType.case === 'extensionFunction' &&
        entry.mappingType.value.functionAnchor === scalar.functionReference
    );
    if (declaration?.mappingType.case !== 'extensionFunction') return null;
    const urnAnchor = declaration.mappingType.value.extensionUrnReference;
    const urn = plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === urnAnchor)?.urn;
    const left = scalar.arguments[0]?.argType;
    const right = scalar.arguments[1]?.argType;
    const reference =
      left?.case === 'value' && left.value.rexType.case === 'selection'
        ? left.value.rexType.value
        : null;
    const segment =
      reference?.referenceType.case === 'directReference'
        ? reference.referenceType.value.referenceType
        : null;
    const literal = right?.case === 'value' ? right.value.rexType : undefined;
    return declaration.mappingType.value.name === 'equal' &&
      urn === URN &&
      scalar.arguments.length === 2 &&
      scalar.options.length === 0 &&
      scalar.outputType?.kind.case === 'bool' &&
      reference?.rootType.case === 'rootReference' &&
      segment?.case === 'structField' &&
      segment.value.child == null &&
      literal?.case === 'literal' &&
      literal.value.literalType.case === 'string'
      ? {
          sourceOrdinal: segment.value.field,
          value: literal.value.literalType.value,
          functionAnchor: scalar.functionReference,
          urnAnchor,
        }
      : null;
  },
  removeDeclaration(plan: Plan, equality: EqualityInspection): void {
    plan.extensions = plan.extensions.filter(
      (entry) =>
        entry.mappingType.case !== 'extensionFunction' ||
        entry.mappingType.value.functionAnchor !== equality.functionAnchor
    );
    if (
      !plan.extensions.some(
        (entry) =>
          entry.mappingType.case === 'extensionFunction' &&
          entry.mappingType.value.extensionUrnReference === equality.urnAnchor
      )
    ) {
      plan.extensionUrns = plan.extensionUrns.filter(
        (entry) => entry.extensionUrnAnchor !== equality.urnAnchor
      );
    }
  },
};
