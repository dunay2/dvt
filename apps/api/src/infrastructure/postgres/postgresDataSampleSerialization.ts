/** Owned concern: convert PostgreSQL result metadata and values into display-safe sample cells. */
export function serializePostgresSampleCell(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `\\x${value.toString('hex')}`;
  if (typeof value === 'object') {
    return JSON.stringify(value, (_key, nested) =>
      typeof nested === 'bigint' ? nested.toString() : nested
    );
  }
  return String(value);
}

export function postgresTypeNameFromDataTypeId(dataTypeId: number | undefined): string {
  switch (dataTypeId) {
    case 16:
      return 'boolean';
    case 17:
      return 'bytea';
    case 20:
      return 'bigint';
    case 21:
      return 'smallint';
    case 23:
      return 'integer';
    case 25:
      return 'text';
    case 700:
      return 'real';
    case 701:
      return 'double precision';
    case 1042:
      return 'character';
    case 1043:
      return 'character varying';
    case 1082:
      return 'date';
    case 1083:
      return 'time';
    case 1114:
      return 'timestamp';
    case 114:
      return 'json';
    case 1184:
      return 'timestamp with time zone';
    case 1266:
      return 'time with time zone';
    case 1700:
      return 'numeric';
    case 2950:
      return 'uuid';
    case 3802:
      return 'jsonb';
    default:
      return 'unknown';
  }
}
