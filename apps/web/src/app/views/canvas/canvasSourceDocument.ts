/** Assemble the canonical document once when creating a model from source occurrences. */
import { create } from '@bufbuild/protobuf';
import {
  PlanSchema,
  PlanRelSchema,
  type Plan,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_SPEC_VERSION,
} from '@dvt/contracts';
import {
  deriveSubstraitSchemas,
  type RelationChangeSet,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import {
  orderedDvtSubstraitFields,
  buildDvtSubstraitFieldTree,
  flattenDvtSubstraitFieldNames,
} from './canvasDvtSubstraitStructuredField';

export function createSourcePlan(): Plan {
  const [majorNumber, minorNumber, patchNumber] = DVT_SUBSTRAIT_SPEC_VERSION.split('.').map(Number);
  return create(PlanSchema, {
    version: { majorNumber, minorNumber, patchNumber, producer: 'dvt-canvas' },
  });
}

export function createSourceDocument(
  entries: RelationChangeSet['upserts'],
  root: RelationChangeSet['upserts'][number],
  plan = createSourcePlan()
): SubstraitDocument {
  const names = flattenDvtSubstraitFieldNames(
    orderedDvtSubstraitFields(root.fields, root.binding.relationId).map((field) =>
      buildDvtSubstraitFieldTree(field, root.fields)
    )
  );
  const document: SubstraitDocument = {
    plan: {
      ...plan,
      relations: [
        create(PlanRelSchema, {
          relType: { case: 'root', value: { input: root.relation, names } },
        }),
      ],
    },
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: '0'.repeat(64),
      relations: entries.map((entry) => entry.binding),
      fields: entries.flatMap((entry) => entry.fields),
    },
  };
  deriveSubstraitSchemas(document);
  return document;
}
