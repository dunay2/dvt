/** Owns canonical Canvas authoring for explicit Substrait CrossRel chains. */
import { create } from '@bufbuild/protobuf';
import {
  CrossRelSchema,
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelRootSchema,
  RelSchema,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  PlanRelSchema,
  PlanSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  NamedStructSchema,
  TypeSchema,
  Type_BooleanSchema,
  Type_FP64Schema,
  Type_I64Schema,
  Type_Nullability,
  Type_PrecisionTimestampTZSchema,
  Type_StringSchema,
  Type_StructSchema,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  allocateDvtFieldId,
  allocateDvtRelationId,
  buildDvtSubstraitStandardCapabilityId,
  type DvtSubstraitAuthoringSidecarV1,
} from '@dvt/contracts';
import {
  ZERO_SHA256,
  hasSameConnectionRef,
  inspectDvtSubstraitCrossDraft,
  inspectDvtSubstraitAcceptedCrossDraft,
  type DvtSubstraitCrossDraft,
  type DvtSubstraitJoinDataType,
} from '@dvt/postgres-projection';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { hasSameConnectedSourceRef } from './canvasDvtSubstraitJoinSourceResolution';
import { encodeDvtSubstraitSemanticDraft } from './canvasDvtSubstraitSemanticCodec';

const TYPE_SELECTOR: Readonly<Record<DvtSubstraitJoinDataType, string>> = {
  string: 'kind.string',
  bool: 'kind.bool',
  i64: 'kind.i64',
  fp64: 'kind.fp64',
  precisionTimestampTz: 'kind.precision_timestamp_tz',
};

function requireCapability(message: string, selector?: string): void {
  const entryId = buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message,
    ...(selector == null ? {} : { selector }),
  });
  if (
    !DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
      (entry) =>
        entry.kind === 'standard' &&
        entry.entryId === entryId &&
        entry.profileStatus === 'supported-profile'
    )
  ) {
    throw new Error(`Substrait capability ${entryId} is not supported.`);
  }
}

function requireType(dataType: DvtSubstraitJoinDataType): void {
  const entryId = buildDvtSubstraitStandardCapabilityId('type', {
    sourceKind: 'core',
    message: 'substrait.Type',
    selector: TYPE_SELECTOR[dataType],
  });
  if (
    !DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
      (entry) =>
        entry.kind === 'standard' &&
        entry.entryId === entryId &&
        entry.profileStatus === 'supported-profile'
    )
  ) {
    throw new Error(`Substrait capability ${entryId} is not supported.`);
  }
}

function crossFieldType(dataType: DvtSubstraitJoinDataType, nullable: boolean): Type {
  const nullability = nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED;
  if (dataType === 'string') {
    return create(TypeSchema, {
      kind: { case: 'string', value: create(Type_StringSchema, { nullability }) },
    });
  }
  if (dataType === 'bool') {
    return create(TypeSchema, {
      kind: { case: 'bool', value: create(Type_BooleanSchema, { nullability }) },
    });
  }
  if (dataType === 'i64') {
    return create(TypeSchema, {
      kind: { case: 'i64', value: create(Type_I64Schema, { nullability }) },
    });
  }
  if (dataType === 'fp64') {
    return create(TypeSchema, {
      kind: { case: 'fp64', value: create(Type_FP64Schema, { nullability }) },
    });
  }
  return create(TypeSchema, {
    kind: {
      case: 'precisionTimestampTz',
      value: create(Type_PrecisionTimestampTZSchema, { precision: 3, nullability }),
    },
  });
}

function uniqueOutputName(
  input: CanvasDvtCompositionInput,
  fieldName: string,
  used: ReadonlySet<string>
): string {
  const name = [
    fieldName,
    `${input.table}_${fieldName}`,
    `${input.schema}_${input.table}_${fieldName}`,
    `${input.nodeId}_${fieldName}`,
  ].find((candidate) => !used.has(candidate));
  if (name == null) throw new Error('CROSS output names cannot be made unique.');
  return name;
}

type Origin = Readonly<{
  inputIndex: number;
  name: string;
  fieldId: string;
  dataType: DvtSubstraitJoinDataType;
  nullable: boolean;
}>;

export function createDvtSubstraitCrossDraft(
  args: Readonly<{
    inputs: readonly CanvasDvtCompositionInput[];
    previousDraft?: DvtSubstraitCrossDraft;
  }>
): DvtSubstraitCrossDraft {
  requireCapability('substrait.CrossRel');
  if (args.inputs.length < 2) throw new Error('CROSS requires at least two inputs.');
  const firstConnection = args.inputs[0]?.sourceRef.connectionRef;
  if (
    firstConnection == null ||
    firstConnection.provider !== 'postgres' ||
    args.inputs.some(
      (input) =>
        input.schema.length === 0 ||
        input.table.length === 0 ||
        input.fields.length === 0 ||
        input.fields.some(
          (field) =>
            field.name.length === 0 ||
            field.name !== field.name.trim() ||
            field.joinDataType == null
        ) ||
        new Set(input.fields.map((field) => field.name)).size !== input.fields.length ||
        !hasSameConnectionRef(firstConnection, input.sourceRef.connectionRef)
    ) ||
    new Set(
      args.inputs.map(
        (input) => `${input.sourceRef.connectionRef.connectionId}:${input.sourceRef.sourceObjectId}`
      )
    ).size !== args.inputs.length
  ) {
    throw new Error('CROSS requires distinct admitted PostgreSQL inputs on one connection.');
  }
  const dataTypes = args.inputs.flatMap((input) =>
    input.fields.map((field) => field.joinDataType!)
  );
  new Set(dataTypes).forEach(requireType);

  const previous =
    args.previousDraft == null ? null : inspectDvtSubstraitCrossDraft(args.previousDraft);
  const previousProjection = previous?.ok ? previous.projection : null;
  const inputIdentities = args.inputs.map((input, inputIndex) => {
    const prior = previousProjection?.inputs.find((candidate) =>
      hasSameConnectedSourceRef(candidate.sourceRef, input.sourceRef)
    );
    const priorFields = new Map(prior?.fields.map((field) => [field.name, field.fieldId]));
    return {
      relationId: prior?.relationId ?? allocateDvtRelationId(),
      fields: input.fields.map((field) => ({
        inputIndex,
        name: field.name,
        fieldId: priorFields.get(field.name) ?? allocateDvtFieldId(),
        dataType: field.joinDataType!,
        nullable: field.nullable ?? true,
      })),
    };
  });
  const reads = args.inputs.map((input, inputIndex) =>
    create(RelSchema, {
      relType: {
        case: 'read',
        value: create(ReadRelSchema, {
          common: create(RelCommonSchema, { relAnchor: inputIndex + 1 }),
          baseSchema: create(NamedStructSchema, {
            names: input.fields.map((field) => field.name),
            struct: create(Type_StructSchema, {
              types: input.fields.map((field) =>
                crossFieldType(field.joinDataType!, field.nullable ?? true)
              ),
              nullability: Type_Nullability.REQUIRED,
            }),
          }),
          readType: {
            case: 'namedTable',
            value: create(ReadRel_NamedTableSchema, { names: [input.schema, input.table] }),
          },
        }),
      },
    })
  );
  const stageRelationIds = args.inputs
    .slice(1)
    .map(
      (_, stageIndex) =>
        previousProjection?.crossRelations[stageIndex]?.relationId ?? allocateDvtRelationId()
    );
  const stageOrigins: Origin[][] = [];
  let current = reads[0]!;
  let currentOrigins: Origin[] = [...inputIdentities[0]!.fields];
  for (let stageIndex = 0; stageIndex < args.inputs.length - 1; stageIndex += 1) {
    const rightInputIndex = stageIndex + 1;
    currentOrigins = [...currentOrigins, ...inputIdentities[rightInputIndex]!.fields];
    current = create(RelSchema, {
      relType: {
        case: 'cross',
        value: create(CrossRelSchema, {
          common: create(RelCommonSchema, {
            relAnchor: args.inputs.length + stageIndex + 1,
            emitKind: {
              case: 'emit',
              value: create(RelCommon_EmitSchema, {
                outputMapping: currentOrigins.map((_, ordinal) => ordinal),
              }),
            },
          }),
          left: current,
          right: reads[rightInputIndex],
        }),
      },
    });
    stageOrigins.push([...currentOrigins]);
  }

  const usedNames = new Set<string>();
  const outputNameByFieldId = new Map<string, string>();
  args.inputs.forEach((input, inputIndex) =>
    input.fields.forEach((field, fieldIndex) => {
      const name = uniqueOutputName(input, field.name, usedNames);
      usedNames.add(name);
      outputNameByFieldId.set(inputIdentities[inputIndex]!.fields[fieldIndex]!.fieldId, name);
    })
  );
  const finalOrigins = stageOrigins.at(-1)!;
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer: 'dvt-vtx2-cross-card',
    },
    relations: [
      create(PlanRelSchema, {
        relType: {
          case: 'root',
          value: create(RelRootSchema, {
            input: current,
            names: finalOrigins.map((origin) => outputNameByFieldId.get(origin.fieldId)!),
          }),
        },
      }),
    ],
  });
  const relations: DvtSubstraitAuthoringSidecarV1['relations'] = [
    ...args.inputs.map((input, inputIndex) => ({
      relationId: inputIdentities[inputIndex]!.relationId,
      relAnchor: inputIndex + 1,
      sourceRef: input.sourceRef,
      displayName: input.table,
    })),
    ...stageRelationIds.map((relationId, stageIndex) => ({
      relationId,
      relAnchor: args.inputs.length + stageIndex + 1,
      displayName: args.inputs
        .slice(0, stageIndex + 2)
        .map((input) => input.table)
        .join('+'),
    })),
  ];
  const fields: DvtSubstraitAuthoringSidecarV1['fields'] = [
    ...inputIdentities.flatMap((identity) =>
      identity.fields.map((field, outputOrdinal) => ({
        fieldId: field.fieldId,
        relationId: identity.relationId,
        outputOrdinal,
        displayName: field.name,
      }))
    ),
    ...stageOrigins.flatMap((origins, stageIndex) => {
      const relationId = stageRelationIds[stageIndex]!;
      const previousStage = previousProjection?.crossRelations[stageIndex];
      const previousFields =
        previousStage == null
          ? []
          : args.previousDraft!.sidecar.fields.filter(
              (field) => field.relationId === previousStage.relationId
            );
      const previousBySource = new Map(
        previousFields.flatMap((field) =>
          field.sourceFieldId == null ? [] : [[field.sourceFieldId, field.fieldId] as const]
        )
      );
      const finalStage = stageIndex === stageOrigins.length - 1;
      return origins.map((origin, outputOrdinal) => ({
        fieldId: previousBySource.get(origin.fieldId) ?? allocateDvtFieldId(),
        relationId,
        sourceFieldId: origin.fieldId,
        outputOrdinal,
        displayName: finalStage ? outputNameByFieldId.get(origin.fieldId)! : origin.name,
      }));
    }),
  ];
  const draft: DvtSubstraitCrossDraft = {
    plan,
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: ZERO_SHA256,
      relations,
      fields,
    },
  };
  if (!inspectDvtSubstraitCrossDraft(draft).ok) {
    throw new Error('CROSS authoring produced a non-admitted semantic document.');
  }
  return draft;
}

export function appendDvtSubstraitCrossInput(
  draft: DvtSubstraitCrossDraft,
  inputs: readonly CanvasDvtCompositionInput[]
): DvtSubstraitCrossDraft {
  return createDvtSubstraitCrossDraft({ inputs, previousDraft: draft });
}

export function encodeDvtSubstraitCrossDocument(draft: DvtSubstraitCrossDraft) {
  return encodeDvtSubstraitSemanticDraft(
    draft,
    (candidate) => inspectDvtSubstraitAcceptedCrossDraft(candidate).ok,
    'Unsupported VTX2 CrossRel Substrait shape.'
  );
}
