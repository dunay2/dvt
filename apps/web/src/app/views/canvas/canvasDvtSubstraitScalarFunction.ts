/** Build one admitted scalar expression independently of relation placement. */
import { create } from '@bufbuild/protobuf';
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_I64Schema,
  Type_Nullability,
  Type_StringSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import {
  admitsCompleteArgumentCount,
  resolveDvtSubstraitColumnFunctions,
} from '@dvt/postgres-projection';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

export function buildDvtSubstraitScalarFunction(
  args: Readonly<{
    plan: Plan;
    capabilityId: string;
    dataTypes: readonly string[];
    operands: readonly Expression[];
    provider: string;
  }>
): Expression | null {
  const capability = resolveDvtSubstraitColumnFunctions({
    dataTypes: args.dataTypes,
    provider: args.provider,
    resolution: 'complete',
  }).find((entry) => entry.capabilityId === args.capabilityId);
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (candidate) => candidate.entryId === args.capabilityId
  );
  if (
    capability == null ||
    !admitsCompleteArgumentCount(capability, args.operands.length) ||
    args.dataTypes.length !== args.operands.length ||
    entry == null ||
    entry.kind !== 'standard' ||
    entry.category !== 'scalar-function' ||
    entry.profileStatus !== 'supported-profile' ||
    entry.identity.sourceKind !== 'simple-extension'
  ) {
    return null;
  }

  const signature = entry.invocation?.signature ?? `${entry.identity.name}:str`;
  const extractYearUtc =
    entry.identity.urn === 'extension:io.substrait:functions_datetime' &&
    entry.identity.name === 'extract' &&
    signature === 'extract:req_ptstz_str';
  const declaration = dvtSubstraitExpression.ensureScalarFunction(args.plan, {
    urn: entry.identity.urn,
    name: signature,
  });
  return dvtSubstraitExpression.scalarFunction({
    functionReference: declaration.functionAnchor,
    arguments: extractYearUtc
      ? [args.operands[0]!, dvtSubstraitExpression.literal({ dataType: 'string', value: 'UTC' })]
      : args.operands,
    leadingEnumArguments: extractYearUtc ? ['YEAR'] : undefined,
    options: entry.invocation?.options,
    outputType: extractYearUtc
      ? create(TypeSchema, {
          kind: {
            case: 'i64',
            value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
          },
        })
      : create(TypeSchema, {
          kind: {
            case: 'string',
            value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
          },
        }),
  });
}
