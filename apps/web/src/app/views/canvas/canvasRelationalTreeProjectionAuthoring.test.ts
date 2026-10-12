import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { source } from './canvasRelationalOperator.test-support';

describe('typed source projection', () => {
  it('preserves arbitrary fields, canonical types and nullability instead of a pilot schema', () => {
    const types = ['string', 'i64', 'fp64', 'bool', 'precisionTimestampTz'] as const;
    const fields = types.map((type, ordinal) => ({
      name: 'field_' + ordinal,
      dataType: type,
      joinDataType: type,
      nullable: ordinal % 2 === 0,
    }));
    const document = createCanvasRelationalTreeProjectionDraft({
      targetNodeId: 'model',
      input: { ...source('measurements'), fields },
    });
    const result = deriveSubstraitSchemas(document);
    const rootFields = result.schemas.get(result.index.rootId)!;
    expect(rootFields.map((field) => field.type.kind.case)).toEqual(types);
    expect(
      rootFields.map((field) =>
        'nullability' in field.type.kind.value! ? field.type.kind.value.nullability : null
      )
    ).toEqual(
      fields.map((field) =>
        field.nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED
      )
    );
    expect(
      result.index.relations.get(result.index.rootId)!.fields.map((field) => field.displayName)
    ).toEqual(fields.map((field) => field.name));
    expect(rootFields.every((field) => field.sourceFieldIds.length === 1)).toBe(true);
  });
});
