/** Owns shared catalog-driven function admission; no Canvas or runtime dependency. */
import {
  TypeSchema,
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  type DvtSubstraitFunctionInvocationV1,
} from '@dvt/contracts';

import { scalarBindings, scalarResultType } from './relationalSql/scalarBindings.js';

export const STRING_DATA_TYPES = new Set([
  'text',
  'string',
  'varchar',
  'character varying',
  'char',
  'character',
  'bpchar',
]);

export const TIMESTAMPTZ_DATA_TYPES = new Set([
  'timestamp with time zone',
  'timestamptz',
  'timestamp_tz',
]);

export function normalizeProjectionDataType(dataType: unknown): string {
  return typeof dataType === 'string' ? dataType.trim().toLowerCase().replaceAll(/\s+/g, ' ') : '';
}

export type DvtSubstraitColumnFunction = Readonly<{
  capabilityId: string;
  name: string;
  category: 'text' | 'date-time' | 'numeric' | 'boolean';
  signature: string;
  outputType: Type;
  invocation?: DvtSubstraitFunctionInvocationV1;
  minimumArgumentCount: number;
  maximumArgumentCount?: number;
  expressionTemplate?: string;
}>;

export function invocationArgumentRange(
  invocation:
    | Readonly<{
        minimumArgumentCount: number;
        maximumArgumentCount?: number | undefined;
      }>
    | undefined
): Readonly<{ minimumArgumentCount: number; maximumArgumentCount?: number }> {
  return invocation == null
    ? { minimumArgumentCount: 1, maximumArgumentCount: 1 }
    : {
        minimumArgumentCount: invocation.minimumArgumentCount,
        ...(invocation.maximumArgumentCount == null
          ? {}
          : { maximumArgumentCount: invocation.maximumArgumentCount }),
      };
}

export function admitsProposedArgumentCount(
  range: Readonly<{ minimumArgumentCount: number; maximumArgumentCount?: number }>,
  proposedCount: number
): boolean {
  return (
    proposedCount > 0 &&
    (range.maximumArgumentCount == null || proposedCount <= range.maximumArgumentCount)
  );
}

export function admitsCompleteArgumentCount(
  range: Readonly<{ minimumArgumentCount: number; maximumArgumentCount?: number }>,
  completeCount: number
): boolean {
  return (
    completeCount >= range.minimumArgumentCount &&
    (range.maximumArgumentCount == null || completeCount <= range.maximumArgumentCount)
  );
}

export function resolveDvtSubstraitColumnFunctions(args: {
  dataType?: string;
  dataTypes?: readonly string[];
  provider: string;
  resolution?: 'proposal' | 'complete';
}): readonly DvtSubstraitColumnFunction[] {
  const normalizedTypes = (args.dataTypes ?? (args.dataType == null ? [] : [args.dataType])).map(
    normalizeProjectionDataType
  );
  if (args.provider !== 'postgres' || normalizedTypes.length === 0) return [];
  const types = normalizedTypes.map((type): Type | null => {
    const nullability = Type_Nullability.NULLABLE;
    if (TIMESTAMPTZ_DATA_TYPES.has(type))
      return create(TypeSchema, {
        kind: { case: 'precisionTimestampTz', value: { precision: 3, nullability } },
      });
    const kind = STRING_DATA_TYPES.has(type)
      ? 'string'
      : ['bigint', 'int8', 'i64'].includes(type)
        ? 'i64'
        : ['double precision', 'float8', 'fp64'].includes(type)
          ? 'fp64'
          : ['boolean', 'bool'].includes(type)
            ? 'bool'
            : null;
    return kind == null
      ? null
      : create(TypeSchema, { kind: { case: kind, value: { nullability } } });
  });
  if (types.some((type) => type == null)) return [];
  const operands = types as Type[];
  const timestampOperand =
    normalizedTypes.length === 1 && TIMESTAMPTZ_DATA_TYPES.has(normalizedTypes[0]!);

  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.flatMap<DvtSubstraitColumnFunction>(
    (entry) => {
      if (
        entry.kind !== 'standard' ||
        entry.category !== 'scalar-function' ||
        entry.profileStatus !== 'supported-profile' ||
        entry.identity.sourceKind !== 'simple-extension'
      ) {
        return [];
      }
      if (
        timestampOperand &&
        entry.identity.urn === 'extension:io.substrait:functions_datetime' &&
        entry.identity.name === 'extract' &&
        entry.invocation?.signature === 'extract:req_ptstz_str' &&
        entry.invocation.argumentTypes.join('_') === 'req_ptstz_str' &&
        entry.invocation.minimumArgumentCount === 3 &&
        entry.invocation.maximumArgumentCount === 3 &&
        entry.invocation.outputType === 'i64' &&
        entry.invocation.options.length === 0
      ) {
        return [
          {
            capabilityId: entry.entryId,
            name: 'extract year (UTC)',
            category: 'date-time' as const,
            signature: entry.invocation.signature,
            outputType: scalarResultType(scalarBindings['extract']!, operands),
            minimumArgumentCount: 1,
            maximumArgumentCount: 1,
            expressionTemplate: "EXTRACT(YEAR FROM {column} AT TIME ZONE 'UTC')",
          },
        ];
      }
      const invocation =
        entry.overloads?.find((item) =>
          operands.every((type) => type.kind.case === item.outputType)
        ) ?? entry.invocation;
      if (entry.overloads != null && invocation == null) return [];
      const key = invocation?.signature ?? entry.identity.name;
      const binding = Object.hasOwn(scalarBindings, key)
        ? scalarBindings[key]
        : Object.hasOwn(scalarBindings, entry.identity.name)
          ? scalarBindings[entry.identity.name]
          : undefined;
      if (
        binding == null ||
        binding.arguments != null ||
        entry.identity.urn !== `extension:io.substrait:${binding.family}` ||
        !binding.accepts(operands)
      )
        return [];
      const range = {
        minimumArgumentCount: binding.minimum,
        ...(binding.maximum == null ? {} : { maximumArgumentCount: binding.maximum }),
      };
      const admitted =
        args.resolution === 'proposal'
          ? admitsProposedArgumentCount(range, operands.length)
          : admitsCompleteArgumentCount(range, operands.length);
      if (!admitted) return [];
      const outputType = scalarResultType(binding, operands);
      return [
        {
          capabilityId: entry.entryId,
          name: entry.identity.name,
          signature: invocation?.signature ?? binding.signature,
          outputType,
          category:
            outputType.kind.case === 'bool'
              ? 'boolean'
              : outputType.kind.case === 'string'
                ? 'text'
                : outputType.kind.case === 'precisionTimestampTz'
                  ? 'date-time'
                  : 'numeric',
          ...(invocation == null ? {} : { invocation }),
          ...range,
        },
      ];
    }
  );
}
