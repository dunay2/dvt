/** Owns shared catalog-driven function admission; no Canvas or runtime dependency. */
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

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
  category: 'text' | 'date-time';
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
  const stringOperands = normalizedTypes.every((dataType) => STRING_DATA_TYPES.has(dataType));
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
      const textFunction =
        entry.identity.urn === 'extension:io.substrait:functions_string' ||
        (entry.identity.urn === 'extension:io.substrait:functions_comparison' &&
          entry.identity.name === 'coalesce' &&
          entry.invocation?.signature === 'coalesce:any1');
      if (stringOperands && textFunction) {
        const range = invocationArgumentRange(entry.invocation);
        const admitted =
          args.resolution === 'proposal'
            ? admitsProposedArgumentCount(range, normalizedTypes.length)
            : admitsCompleteArgumentCount(range, normalizedTypes.length);
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
