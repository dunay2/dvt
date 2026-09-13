/** Owned concern: normalize the exact source data-type aliases used by DVT projection authoring. */

const STRING_DATA_TYPES = new Set([
  'text',
  'string',
  'varchar',
  'character varying',
  'char',
  'character',
  'bpchar',
]);

const TIMESTAMPTZ_DATA_TYPES = new Set([
  'timestamp with time zone',
  'timestamptz',
  'timestamp_tz',
]);

export function normalizeDvtSubstraitProjectionDataType(dataType: unknown): string {
  return typeof dataType === 'string' ? dataType.trim().toLowerCase().replaceAll(/\s+/g, ' ') : '';
}

export function isDvtSubstraitProjectionStringDataType(dataType: string): boolean {
  return STRING_DATA_TYPES.has(dataType);
}

export function isDvtSubstraitProjectionTimestampTzDataType(dataType: string): boolean {
  return TIMESTAMPTZ_DATA_TYPES.has(dataType);
}
