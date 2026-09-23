import type { DvtSubstraitProjectionDraft } from '../../src/index.js';

import { canonicalDraft } from './connectedFieldDraft.js';

export function opaqueIdentityDraft(): DvtSubstraitProjectionDraft {
  const draft = canonicalDraft();
  const sourceRelationId = 'dvt_rel_opaque_source';
  const targetRelationId = 'dvt_rel_opaque_target';
  const sourceFieldIds = ['dvt_fld_opaque_order_id', 'dvt_fld_opaque_customer'];

  return {
    ...draft,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.map((relation) =>
        relation.relAnchor === 1
          ? { ...relation, relationId: sourceRelationId, displayName: 'shared-name' }
          : { ...relation, relationId: targetRelationId, displayName: 'shared-name' }
      ),
      fields: draft.sidecar.fields.map((field) => {
        if (field.relationId === 'relation:source-orders') {
          return {
            ...field,
            relationId: sourceRelationId,
            fieldId: sourceFieldIds[field.outputOrdinal]!,
          };
        }
        return {
          ...field,
          relationId: targetRelationId,
          sourceFieldId: sourceFieldIds[field.outputOrdinal],
        };
      }),
    },
  };
}

export function typedCanonicalDraft(): DvtSubstraitProjectionDraft {
  const draft = canonicalDraft();
  const root = draft.plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  const read = project?.case === 'project' ? project.value.input?.relType : undefined;
  if (read?.case !== 'read' || read.value.baseSchema?.struct == null) {
    throw new Error('Expected canonical ReadRel schema.');
  }
  read.value.baseSchema.struct.types = read.value.baseSchema.struct.types.map(() => ({
    kind: {
      case: 'string',
      value: { typeVariationReference: 0, nullability: 1 },
    },
  }));
  return draft;
}

export function unaryFunctionProjectionDraft(): DvtSubstraitProjectionDraft {
  const draft = typedCanonicalDraft();
  const root = draft.plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (root?.case !== 'root' || project?.case !== 'project') {
    throw new Error('Expected canonical ProjectRel.');
  }

  const field = {
    rexType: {
      case: 'selection' as const,
      value: {
        rootType: { case: 'rootReference' as const, value: {} },
        referenceType: {
          case: 'directReference' as const,
          value: {
            referenceType: {
              case: 'structField' as const,
              value: { field: 1 },
            },
          },
        },
      },
    },
  };
  const nullableString = {
    kind: {
      case: 'string' as const,
      value: { typeVariationReference: 0, nullability: 1 },
    },
  };
  const scalar = (
    functionReference: number,
    argument: object
  ): (typeof project.value.expressions)[number] => ({
    rexType: {
      case: 'scalarFunction' as const,
      value: {
        functionReference,
        arguments: [{ argType: { case: 'value' as const, value: argument } }],
        options: [],
        outputType: nullableString,
      },
    },
  });
  const trimmed = scalar(1, field);
  const retrimmed = scalar(1, trimmed);
  const upperRetrimmed = scalar(2, retrimmed);

  draft.plan.extensionUrns = [
    { extensionUrnAnchor: 1, urn: 'extension:io.substrait:functions_string' },
  ];
  draft.plan.extensions = [
    {
      mappingType: {
        case: 'extensionFunction',
        value: { extensionUrnReference: 1, functionAnchor: 1, name: 'trim:str' },
      },
    },
    {
      mappingType: {
        case: 'extensionFunction',
        value: { extensionUrnReference: 1, functionAnchor: 2, name: 'upper:str' },
      },
    },
  ];
  project.value.expressions = [trimmed, upperRetrimmed];
  project.value.common!.emitKind = {
    case: 'emit',
    value: { outputMapping: [0, 2, 3] },
  };
  root.value.names = ['order_id', 'customer_trimmed', 'customer_upper'];

  const targetRelation = draft.sidecar.relations.find((relation) => relation.relAnchor === 2)!;
  draft.sidecar.fields = [
    ...draft.sidecar.fields.filter(
      (candidate) => candidate.relationId !== targetRelation.relationId
    ),
    {
      fieldId: 'output:order_id',
      relationId: targetRelation.relationId,
      sourceFieldId: 'field:source-orders:order_id',
      outputOrdinal: 0,
      displayName: 'order_id',
    },
    {
      fieldId: 'output:customer-trimmed',
      relationId: targetRelation.relationId,
      outputOrdinal: 1,
      displayName: 'customer_trimmed',
    },
    {
      fieldId: 'output:customer-upper',
      relationId: targetRelation.relationId,
      outputOrdinal: 2,
      displayName: 'customer_upper',
    },
  ];
  return draft;
}
