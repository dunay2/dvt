/** Protected physical dependency plus a canonical document with two logical uses. */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  decodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
  encodeDvtSubstraitPlanV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import type { DvtPostgresTargetProjectionPublishInput } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';

import { buildDvtTerminalTransformPreviewDraft } from './workspaceGraphDraftFixture.js';

function repeatedDocument(joinType: JoinRel_JoinType) {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(
    JSON.parse(
      readFileSync(
        new URL(
          '../../../../packages/@dvt/postgres-projection/test/fixtures/repeated-source-document.json',
          import.meta.url
        ),
        'utf8'
      )
    )
  );
  const plan = decodeDvtSubstraitPlanV1(document);
  const root = plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
    throw new Error('Expected canonical JOIN');
  const join = root.value.input.relType.value;
  join.type = joinType;
  const retained =
    joinType === JoinRel_JoinType.LEFT_SEMI || joinType === JoinRel_JoinType.LEFT_ANTI
      ? [0, 1]
      : joinType === JoinRel_JoinType.RIGHT_SEMI || joinType === JoinRel_JoinType.RIGHT_ANTI
        ? [2, 3]
        : [0, 1, 2, 3];
  if (join.common?.emitKind.case !== 'emit') throw new Error('Expected canonical emit');
  join.common.emitKind.value.outputMapping = retained.map((_, index) => index);
  root.value.names = retained.map((index) => root.value.names[index]!);
  const semanticPlan = encodeDvtSubstraitPlanV1(plan);
  document.sidecar.fields = document.sidecar.fields.flatMap((field) => {
    if (field.relationId !== document.sidecar.relations[2]!.relationId) return [field];
    const ordinal = retained.indexOf(field.outputOrdinal);
    return ordinal < 0 ? [] : [{ ...field, outputOrdinal: ordinal }];
  });
  return {
    ...document,
    semanticPlan,
    sidecar: { ...document.sidecar, semanticPlanSha256: semanticPlan.sha256 },
  };
}

export function buildDvtRepeatedSourceDraft(
  joinType = JoinRel_JoinType.LEFT
): WorkspaceGraphAuthoringDraft {
  const base = buildDvtTerminalTransformPreviewDraft();
  const semanticDocument = repeatedDocument(joinType);
  return {
    ...base,
    nodes: [
      {
        ...base.nodes[0]!,
        name: 'Records',
        metadata: {
          schema: 'raw',
          tableName: 'records',
          connectedSourceRef: semanticDocument.sidecar.relations[0]!.sourceRef,
          columns: [
            { name: 'id', type: 'text' },
            { name: 'parent_id', type: 'text' },
          ],
        },
      },
      {
        ...base.nodes[1]!,
        name: 'Related records',
        metadata: { transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument } },
      },
    ],
  };
}

export function repeatedSourceInput(
  draft = buildDvtRepeatedSourceDraft()
): DvtPostgresTargetProjectionPublishInput {
  return {
    scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    draft,
    selectedNodeIds: draft.nodeIds,
    selectedEdgeIds: draft.edges.map((edge) => edge.id),
  };
}
