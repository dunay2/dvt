/** Owned concern: bind physical Canvas metadata to existing canonical JOIN operand types. */
import {
  STRING_DATA_TYPES,
  TIMESTAMPTZ_DATA_TYPES,
  normalizeProjectionDataType,
  type DvtSubstraitJoinDataType,
} from '@dvt/postgres-projection';

const JOIN_DATA_TYPE_BY_PHYSICAL_TYPE = new Map<string, DvtSubstraitJoinDataType>([
  ['bool', 'bool'],
  ['boolean', 'bool'],
  ['bigint', 'i64'],
  ['int8', 'i64'],
  ['i64', 'i64'],
  ['double precision', 'fp64'],
  ['double', 'fp64'],
  ['float8', 'fp64'],
  ['fp64', 'fp64'],
  ['precisiontimestamptz', 'precisionTimestampTz'],
]);

export function resolveCanvasDvtJoinDataType(
  physicalType: string
): DvtSubstraitJoinDataType | null {
  const normalized = normalizeProjectionDataType(physicalType);
  if (STRING_DATA_TYPES.has(normalized)) return 'string';
  if (TIMESTAMPTZ_DATA_TYPES.has(normalized)) return 'precisionTimestampTz';
  return JOIN_DATA_TYPE_BY_PHYSICAL_TYPE.get(normalized) ?? null;
}

export function hasCompatibleCanvasDvtJoinFields(
  left: readonly Readonly<{ joinDataType: DvtSubstraitJoinDataType | null }>[],
  right: readonly Readonly<{ joinDataType: DvtSubstraitJoinDataType | null }>[]
): boolean {
  const leftTypes = new Set(left.map((field) => field.joinDataType).filter((type) => type != null));
  return right.some((field) => field.joinDataType != null && leftTypes.has(field.joinDataType));
}
