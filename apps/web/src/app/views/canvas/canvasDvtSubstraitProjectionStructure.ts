/** Shared structural/type admission rules for canonical field projections. */
import {
  STRING_DATA_TYPES,
  TIMESTAMPTZ_DATA_TYPES,
  normalizeProjectionDataType,
} from '@dvt/postgres-projection';
import { create } from '@bufbuild/protobuf';
import type {
  ProjectRel,
  ReadRel,
  RelCommon,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_I64Schema,
  Type_Nullability,
  Type_PrecisionTimestampTZSchema,
  Type_StringSchema,
  Type_UnboundSchema,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import type { DvtSubstraitAuthoringSidecarV1, DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

const I64_DATA_TYPES = new Set(['bigint', 'int8', 'i64']);

export function createProjectionType(dataType: string): Type {
  const normalized = normalizeProjectionDataType(dataType);
  if (STRING_DATA_TYPES.has(normalized)) {
    return create(TypeSchema, {
      kind: {
        case: 'string',
        value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
      },
    });
  }
  if (TIMESTAMPTZ_DATA_TYPES.has(normalized)) {
    return create(TypeSchema, {
      kind: {
        case: 'precisionTimestampTz',
        value: create(Type_PrecisionTimestampTZSchema, {
          precision: 6,
          nullability: Type_Nullability.NULLABLE,
        }),
      },
    });
  }
  if (I64_DATA_TYPES.has(normalized)) {
    return create(TypeSchema, {
      kind: {
        case: 'i64',
        value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
      },
    });
  }
  return create(TypeSchema, { kind: { case: 'unbound', value: create(Type_UnboundSchema) } });
}

export function inspectProjectionDataType(type: Type): string | null {
  if (type.kind.case === 'unbound') return 'unknown';
  if (
    type.kind.case === 'string' &&
    type.kind.value.typeVariationReference === 0 &&
    type.kind.value.nullability === Type_Nullability.NULLABLE
  ) {
    return 'string';
  }
  if (
    type.kind.case === 'precisionTimestampTz' &&
    type.kind.value.precision === 6 &&
    type.kind.value.typeVariationReference === 0 &&
    type.kind.value.nullability === Type_Nullability.NULLABLE
  ) {
    return 'timestamp with time zone';
  }
  if (
    type.kind.case === 'i64' &&
    type.kind.value.typeVariationReference === 0 &&
    type.kind.value.nullability === Type_Nullability.NULLABLE
  ) {
    return 'bigint';
  }
  return null;
}

export function canonicalizeDvtSubstraitProjectionDataType(dataType: unknown): string {
  return (
    inspectProjectionDataType(createProjectionType(normalizeProjectionDataType(dataType))) ??
    'unknown'
  );
}
function commonHasNoHiddenSemantics(common: RelCommon | undefined): boolean {
  return common != null && common.hint == null && common.advancedExtension == null;
}

export function readHasOnlyProjectionSemantics(read: ReadRel): boolean {
  return (
    commonHasNoHiddenSemantics(read.common) &&
    read.common?.emitKind.case === undefined &&
    read.baseSchema != null &&
    read.filter == null &&
    read.bestEffortFilter == null &&
    read.projection == null &&
    read.advancedExtension == null &&
    read.readType.case === 'namedTable' &&
    read.readType.value.advancedExtension == null
  );
}

export function projectHasOnlyFieldSelection(project: ProjectRel): boolean {
  return (
    commonHasNoHiddenSemantics(project.common) &&
    project.common?.emitKind.case === 'emit' &&
    project.advancedExtension == null
  );
}

export function sortedRelationFields(
  sidecar: DvtSubstraitAuthoringSidecarV1,
  relationId: string
): DvtSubstraitFieldBindingV1[] {
  return [...sidecar.fields]
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}
