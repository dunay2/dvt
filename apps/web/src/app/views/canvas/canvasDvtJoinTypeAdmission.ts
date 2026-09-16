/** Owned concern: bind physical Canvas metadata to existing canonical JOIN operand types. */
import {
  STRING_DATA_TYPES,
  TIMESTAMPTZ_DATA_TYPES,
  normalizeProjectionDataType,
  type DvtSubstraitJoinDataType,
} from '@dvt/postgres-projection';

export function resolveCanvasDvtJoinDataType(
  physicalType: string
): DvtSubstraitJoinDataType | null {
  const normalized = normalizeProjectionDataType(physicalType);
  if (STRING_DATA_TYPES.has(normalized)) return 'string';
  if (TIMESTAMPTZ_DATA_TYPES.has(normalized)) return 'precisionTimestampTz';
  if (normalized === 'bool' || normalized === 'boolean') return 'bool';
  if (normalized === 'bigint' || normalized === 'int8' || normalized === 'i64') return 'i64';
  if (
    normalized === 'double precision' ||
    normalized === 'double' ||
    normalized === 'float8' ||
    normalized === 'fp64'
  ) {
    return 'fp64';
  }
  return normalized === 'precisiontimestamptz' ? 'precisionTimestampTz' : null;
}

export function hasCompatibleCanvasDvtJoinFields(
  left: readonly Readonly<{ joinDataType: DvtSubstraitJoinDataType | null }>[],
  right: readonly Readonly<{ joinDataType: DvtSubstraitJoinDataType | null }>[]
): boolean {
  const leftTypes = new Set(left.map((field) => field.joinDataType).filter((type) => type != null));
  return right.some((field) => field.joinDataType != null && leftTypes.has(field.joinDataType));
}
