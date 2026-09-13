/** Owned concern: project admitted Substrait scalar capabilities into Canvas column-authoring actions. */
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import {
  isDvtSubstraitProjectionStringDataType,
  isDvtSubstraitProjectionTimestampTzDataType,
  normalizeDvtSubstraitProjectionDataType,
} from './canvasDvtSubstraitProjectionDataTypes';

export type DvtSubstraitColumnFunction = Readonly<{
  capabilityId: string;
  name: string;
  category: 'text' | 'date-time';
  minimumArgumentCount: number;
  maximumArgumentCount?: number;
  expressionTemplate?: string;
}>;

export type DvtSubstraitColumnFunctionArgumentRange = Readonly<{
  minimumArgumentCount: number;
  maximumArgumentCount?: number;
}>;

export function resolveDvtSubstraitColumnFunctionArgumentRange(
  invocation:
    | Readonly<{
        minimumArgumentCount: number;
        maximumArgumentCount?: number;
      }>
    | undefined
): DvtSubstraitColumnFunctionArgumentRange {
  return invocation == null
    ? { minimumArgumentCount: 1, maximumArgumentCount: 1 }
    : {
        minimumArgumentCount: invocation.minimumArgumentCount,
        ...(invocation.maximumArgumentCount == null
          ? {}
          : { maximumArgumentCount: invocation.maximumArgumentCount }),
      };
}

function admitsProposedArgumentCount(
  range: DvtSubstraitColumnFunctionArgumentRange,
  proposedCount: number
): boolean {
  return (
    proposedCount > 0 &&
    (range.maximumArgumentCount == null || proposedCount <= range.maximumArgumentCount)
  );
}

export function admitsCompleteDvtSubstraitColumnFunctionArgumentCount(
  range: DvtSubstraitColumnFunctionArgumentRange,
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
    normalizeDvtSubstraitProjectionDataType
  );
  if (args.provider !== 'postgres' || normalizedTypes.length === 0) return [];
  const stringOperands = normalizedTypes.every(isDvtSubstraitProjectionStringDataType);
  const timestampOperand =
    normalizedTypes.length === 1 && isDvtSubstraitProjectionTimestampTzDataType(normalizedTypes[0]!);

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
      const textFunction =
        entry.identity.urn === 'extension:io.substrait:functions_string' ||
        (entry.identity.urn === 'extension:io.substrait:functions_comparison' &&
          entry.identity.name === 'coalesce' &&
          entry.invocation?.signature === 'coalesce:any1');
      if (stringOperands && textFunction) {
        const range = resolveDvtSubstraitColumnFunctionArgumentRange(entry.invocation);
        const admitted =
          args.resolution === 'proposal'
            ? admitsProposedArgumentCount(range, normalizedTypes.length)
            : admitsCompleteDvtSubstraitColumnFunctionArgumentCount(range, normalizedTypes.length);
        return admitted
          ? [
              {
                capabilityId: entry.entryId,
                name: entry.identity.name,
                category: 'text' as const,
                ...range,
              },
            ]
          : [];
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
            minimumArgumentCount: 1,
            maximumArgumentCount: 1,
            expressionTemplate: "EXTRACT(YEAR FROM {column} AT TIME ZONE 'UTC')",
          },
        ];
      }
      return [];
    }
  );
}
