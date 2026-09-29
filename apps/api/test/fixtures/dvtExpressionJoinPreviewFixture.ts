import {
  ExpressionSchema,
  RelSchema,
  type Expression,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
} from '@dvt/contracts';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import { buildDvtJoinPreviewDraft } from './dvtJoinPreviewFixture.js';

const PRE_RELATION_ID = 'dvt_rel_01a0ba77-367f-7abc-8abc-000000000041';
const POST_RELATION_ID = 'dvt_rel_01a0ba77-367f-7abc-8abc-000000000042';
const PRE_FIELD_IDS = [
  'dvt_fld_01a0ba77-367f-7abc-8abc-000000000411',
  'dvt_fld_01a0ba77-367f-7abc-8abc-000000000412',
] as const;
const POST_FIELD_IDS = [
  'dvt_fld_01a0ba77-367f-7abc-8abc-000000000421',
  'dvt_fld_01a0ba77-367f-7abc-8abc-000000000422',
  'dvt_fld_01a0ba77-367f-7abc-8abc-000000000423',
  'dvt_fld_01a0ba77-367f-7abc-8abc-000000000424',
  'dvt_fld_01a0ba77-367f-7abc-8abc-000000000425',
] as const;

function field(ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: {
        rootType: { case: 'rootReference', value: {} },
        referenceType: {
          case: 'directReference',
          value: { referenceType: { case: 'structField', value: { field: ordinal } } },
        },
      },
    },
  });
}

function upper(functionReference: number, ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'scalarFunction',
      value: {
        functionReference,
        arguments: [{ argType: { case: 'value', value: field(ordinal) } }],
        outputType: {
          kind: {
            case: 'string',
            value: { nullability: Type_Nullability.NULLABLE },
          },
        },
      },
    },
  });
}

function relationAnchor(rel: Rel | undefined): number {
  const common =
    rel?.relType.case === 'read'
      ? rel.relType.value.common
      : rel?.relType.case === 'join'
        ? rel.relType.value.common
        : rel?.relType.case === 'project'
          ? rel.relType.value.common
          : undefined;
  const anchor = common?.relAnchor;
  if (anchor == null) throw new Error('Expected anchored relation.');
  return anchor;
}

export function buildExpressionJoinExpressionDocument(): SubstraitDocument {
  const workspace = buildDvtJoinPreviewDraft(2);
  const transform = workspace.nodes.find((node) => node.role === 'transform');
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    transform?.metadata?.transformAuthoring
  );
  const plan = decodeDvtSubstraitPlanV1(authority.semanticDocument);
  const sidecar = globalThis.structuredClone(authority.semanticDocument.sidecar);

  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root') throw new Error('Expected RootRel fixture.');
  const rootValue = root.value;
  const joinRel = rootValue.input;
  if (joinRel?.relType.case !== 'join') throw new Error('Expected two-input JOIN fixture.');
  const join = joinRel.relType.value;
  if (join.left == null || join.right == null || join.common?.emitKind.case !== 'emit') {
    throw new Error('Expected emitted binary JOIN.');
  }

  const leftAnchor = relationAnchor(join.left);
  const joinAnchor = join.common.relAnchor;
  const leftBinding = sidecar.relations.find((binding) => binding.relAnchor === leftAnchor);
  const joinBinding = sidecar.relations.find((binding) => binding.relAnchor === joinAnchor);
  if (leftBinding == null || joinBinding == null) throw new Error('Expected relation bindings.');
  const leftFields = sidecar.fields
    .filter((entry) => entry.relationId === leftBinding.relationId)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal);
  const joinFields = sidecar.fields
    .filter((entry) => entry.relationId === joinBinding.relationId)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal);
  if (leftFields.length !== 2 || joinFields.length !== 4) {
    throw new Error('Unexpected JOIN fixture schema.');
  }

  const extensionUrnAnchor =
    Math.max(0, ...plan.extensionUrns.map((entry) => entry.extensionUrnAnchor)) + 1;
  const functionAnchor =
    Math.max(
      0,
      ...plan.extensions.flatMap((entry) =>
        entry.mappingType.case === 'extensionFunction'
          ? [entry.mappingType.value.functionAnchor]
          : []
      )
    ) + 1;
  plan.extensionUrns.push({
    $typeName: 'substrait.extensions.SimpleExtensionURN',
    extensionUrnAnchor,
    urn: 'extension:io.substrait:functions_string',
  });
  plan.extensions.push({
    $typeName: 'substrait.extensions.SimpleExtensionDeclaration',
    mappingType: {
      case: 'extensionFunction',
      value: {
        $typeName: 'substrait.extensions.SimpleExtensionDeclaration.ExtensionFunction',
        extensionUrnReference: extensionUrnAnchor,
        functionAnchor,
        name: 'upper:str',
      },
    },
  });

  const preProject = create(RelSchema, {
    relType: {
      case: 'project',
      value: {
        common: {
          relAnchor: 4,
          emitKind: { case: 'emit', value: { outputMapping: [2, 1] } },
        },
        input: join.left,
        expressions: [upper(functionAnchor, 0)],
      },
    },
  });
  join.left = preProject;
  sidecar.relations.push({
    relationId: PRE_RELATION_ID,
    relAnchor: 4,
    displayName: 'orders expression',
  });
  sidecar.fields.push(
    {
      fieldId: PRE_FIELD_IDS[0],
      relationId: PRE_RELATION_ID,
      sourceFieldId: leftFields[0]!.fieldId,
      outputOrdinal: 0,
      displayName: 'order_id_norm',
    },
    {
      fieldId: PRE_FIELD_IDS[1],
      relationId: PRE_RELATION_ID,
      sourceFieldId: leftFields[1]!.fieldId,
      outputOrdinal: 1,
      displayName: 'client_id',
    }
  );
  joinFields[0]!.sourceFieldId = PRE_FIELD_IDS[0];
  joinFields[0]!.displayName = 'order_id_norm';
  joinFields[1]!.sourceFieldId = PRE_FIELD_IDS[1];

  const postProject = create(RelSchema, {
    relType: {
      case: 'project',
      value: {
        common: {
          relAnchor: 5,
          emitKind: { case: 'emit', value: { outputMapping: [0, 1, 2, 3, 4] } },
        },
        input: joinRel,
        expressions: [upper(functionAnchor, 3)],
      },
    },
  });
  rootValue.input = postProject;
  rootValue.names = ['order_id_norm', 'client_id', 'client_client_id', 'country', 'country_norm'];
  sidecar.relations.push({
    relationId: POST_RELATION_ID,
    relAnchor: 5,
    displayName: 'joined expression',
  });
  for (const [outputOrdinal, sourceField] of joinFields.entries()) {
    sidecar.fields.push({
      fieldId: POST_FIELD_IDS[outputOrdinal]!,
      relationId: POST_RELATION_ID,
      sourceFieldId: sourceField.fieldId,
      outputOrdinal,
      displayName: sourceField.displayName,
    });
  }
  sidecar.fields.push({
    fieldId: POST_FIELD_IDS[4],
    relationId: POST_RELATION_ID,
    sourceFieldId: joinFields[3]!.fieldId,
    outputOrdinal: 4,
    displayName: 'country_norm',
  });

  sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(plan).sha256;
  return { plan, sidecar };
}
