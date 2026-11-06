/** One provider-type adapter for physical and externally published input fields. */
import {
  TypeSchema,
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';

import {
  STRING_DATA_TYPES,
  TIMESTAMPTZ_DATA_TYPES,
  normalizeProjectionDataType,
} from './substraitColumnFunctionCatalog.js';
import type { DvtSubstraitJoinDataType } from './substraitJoinReadModel.js';

export function resolvePostgresInputDataType(
  physicalType: string
): DvtSubstraitJoinDataType | null {
  const normalized = normalizeProjectionDataType(physicalType);
  if (STRING_DATA_TYPES.has(normalized)) return 'string';
  if (TIMESTAMPTZ_DATA_TYPES.has(normalized)) return 'precisionTimestampTz';
  if (normalized === 'bool' || normalized === 'boolean') return 'bool';
  if (['bigint', 'int8', 'int64', 'i64'].includes(normalized)) return 'i64';
  if (['double precision', 'double', 'float8', 'fp64'].includes(normalized)) return 'fp64';
  return normalized === 'precisiontimestamptz' ? 'precisionTimestampTz' : null;
}

export function sourceFieldType(
  dataType: DvtSubstraitJoinDataType | null,
  nullable: boolean
): Type {
  if (dataType === null) return create(TypeSchema, { kind: { case: 'unbound', value: {} } });
  const nullability = nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED;
  const builders: Record<DvtSubstraitJoinDataType, () => Type> = {
    string: () => create(TypeSchema, { kind: { case: 'string', value: { nullability } } }),
    bool: () => create(TypeSchema, { kind: { case: 'bool', value: { nullability } } }),
    i64: () => create(TypeSchema, { kind: { case: 'i64', value: { nullability } } }),
    fp64: () => create(TypeSchema, { kind: { case: 'fp64', value: { nullability } } }),
    precisionTimestampTz: () =>
      create(TypeSchema, {
        kind: { case: 'precisionTimestampTz', value: { nullability, precision: 3 } },
      }),
  };
  return builders[dataType]();
}
