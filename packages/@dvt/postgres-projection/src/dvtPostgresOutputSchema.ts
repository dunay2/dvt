/** Owns projection of admitted semantic outputs into the canonical PostgreSQL schema value. */
import {
  DvtPostgresOutputSchemaV1Schema,
  type DvtPostgresOutputSchemaV1,
  type DvtPostgresOutputTypeV1,
} from '@dvt/contracts';

import { normalizeProjectionDataType } from './substraitColumnFunctionCatalog.js';

type ProjectedOutput = Readonly<{
  name: string;
  dataType: string;
  outputOrdinal: number;
}>;

const POSTGRES_TYPE_BY_SEMANTIC_TYPE: Readonly<Record<string, DvtPostgresOutputTypeV1>> = {
  string: 'text',
  text: 'text',
  varchar: 'text',
  'character varying': 'text',
  char: 'text',
  character: 'text',
  bpchar: 'text',
  bool: 'boolean',
  boolean: 'boolean',
  i64: 'bigint',
  bigint: 'bigint',
  fp64: 'double precision',
  'double precision': 'double precision',
  double: 'double precision',
  float8: 'double precision',
  precisiontimestamptz: 'timestamp with time zone',
  'timestamp with time zone': 'timestamp with time zone',
  timestamptz: 'timestamp with time zone',
  timestamp_tz: 'timestamp with time zone',
};

export function projectDvtPostgresOutputSchemaV1(
  outputs: readonly ProjectedOutput[]
): DvtPostgresOutputSchemaV1 | null {
  const columns = outputs.map((output) => ({
    ordinal: output.outputOrdinal,
    name: output.name,
    postgresType: POSTGRES_TYPE_BY_SEMANTIC_TYPE[normalizeProjectionDataType(output.dataType)],
    nullable: true,
    defaultExpression: null,
    generatedExpression: null,
    collation: null,
  }));
  if (columns.some((column) => column.postgresType === undefined)) return null;

  const parsed = DvtPostgresOutputSchemaV1Schema.safeParse({
    schemaVersion: 'dvt-postgres-output-schema.v1',
    columns,
    constraints: [],
    indexes: [],
  });
  return parsed.success ? parsed.data : null;
}
