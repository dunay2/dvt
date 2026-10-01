/** Canonical multi-field pending Read used by protected read/write boundary regressions. */
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { toBinary } from '@bufbuild/protobuf';
import {
  decodeDvtSubstraitPlanV1,
  type DvtRelationalAuthoringDraftV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import {
  buildCanonicalSemanticDocument,
  buildCanonicalSemanticWorkspaceGraphDraft,
} from './workspaceGraphDraftFixture.js';

export function buildPendingReadDraftFixture(): {
  draft: WorkspaceGraphAuthoringDraft;
  pending: DvtRelationalAuthoringDraftV1;
} {
  const draft = buildCanonicalSemanticWorkspaceGraphDraft();
  const document = buildCanonicalSemanticDocument();
  const plan = decodeDvtSubstraitPlanV1(document);
  const root = plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
    throw new Error('Expected fixture Project.');
  root.value.input = root.value.input.relType.value.input;
  const bytes = toBinary(PlanSchema, plan);
  document.semanticPlan = {
    ...document.semanticPlan,
    bytesBase64: Buffer.from(bytes).toString('base64'),
    sha256: sha256Hex(bytes),
  };
  document.sidecar.semanticPlanSha256 = document.semanticPlan.sha256;
  const relation = document.sidecar.relations[0]!;
  relation.sourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse',
      provider: 'postgres',
    },
    sourceObjectId: 'public.customers',
  };
  document.sidecar.relations = [relation];
  document.sidecar.fields = document.sidecar.fields.map((field) => ({
    ...field,
    relationId: relation.relationId,
  }));
  const pending = {
    version: 'v1',
    sources: [
      {
        relationId: relation.relationId,
        sourceNodeId: 'source_1',
        displayName: 'customers',
        semanticDocument: document,
      },
    ],
    operations: [],
    outputRelationId: null,
    positions: {},
  } satisfies DvtRelationalAuthoringDraftV1;
  const model = draft.nodes.find((node) => node.id === 'transform_1')!;
  model.metadata = { ...model.metadata, relationalAuthoringDraft: pending };
  return { draft, pending };
}
