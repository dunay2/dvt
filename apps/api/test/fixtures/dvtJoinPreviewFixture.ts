/** Canonical documents exported by the existing Canvas JOIN authoring path. */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  DvtSubstraitSemanticDocumentV1Schema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { buildDvtTerminalTransformPreviewDraft } from './workspaceGraphDraftFixture.js';

const documents = JSON.parse(
  readFileSync(
    new URL(
      '../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json',
      import.meta.url
    ),
    'utf8'
  )
) as Record<string, unknown>;

const THREE_INPUT_FINAL_LEFT_PLAN = {
  bytesBase64:
    'Eg0aCxABGgVlcXVhbCABEgsaCRACGgNhbmQgAhrxAhLuAgqyAjKvAgoLEgcKBQABAgMFKAUStAEysQEKChIGCgQAAQIDKAQSPAo6CgIoARIlCghvcmRlcl9pZAoJY2xpZW50X2lkEg4KBGICEAEKBGICEAEYAjoNCgNyYXcKBm9yZGVycxo7CjkKAigCEiQKCWNsaWVudF9pZAoHY291bnRyeRIOCgRiAhABCgRiAhABGAI6DQoDcmF3CgZjbGllbnQiJhokCAEaBAoCEAEiDBoKEggKBBICCAEiACIMGgoSCAoEEgIIAiIAMAEaQQo/CgIoAxIjCghvcmRlcl9pZAoHcHJvZHVjdBIOCgRiAhABCgRiAhABGAI6FAoDcmF3Cg1vcmRlcl9kZXRhaWxzIiQaIggBGgQKAhABIgoaCBIGCgISACIAIgwaChIICgQSAggEIgAwAxIIb3JkZXJfaWQSCWNsaWVudF9pZBIQY2xpZW50X2NsaWVudF9pZBIHY291bnRyeRIHcHJvZHVjdDIkEGUqIGR2dC12dHgyLW4taW5wdXQtaW5uZXItam9pbi1jYXJkQi8IARIrZXh0ZW5zaW9uOmlvLnN1YnN0cmFpdDpmdW5jdGlvbnNfY29tcGFyaXNvbkIsCAISKGV4dGVuc2lvbjppby5zdWJzdHJhaXQ6ZnVuY3Rpb25zX2Jvb2xlYW4=',
  sha256: '6ed7f3731ee600313e3c2705a57d24c78a6908fa8550f57de1b06292b0e0e4b7',
} as const;

export function buildDvtJoinPreviewDraft(
  inputCount: 2 | 3,
  finalJoinType: 'inner' | 'left' = 'inner'
): WorkspaceGraphAuthoringDraft {
  const base = buildDvtTerminalTransformPreviewDraft();
  const fixture = DvtSubstraitSemanticDocumentV1Schema.parse(
    documents[inputCount === 2 ? 'two' : 'three']
  );
  const semanticDocument =
    inputCount === 3 && finalJoinType === 'left'
      ? DvtSubstraitSemanticDocumentV1Schema.parse({
          ...fixture,
          semanticPlan: { ...fixture.semanticPlan, ...THREE_INPUT_FINAL_LEFT_PLAN },
          sidecar: {
            ...fixture.sidecar,
            semanticPlanSha256: THREE_INPUT_FINAL_LEFT_PLAN.sha256,
          },
        })
      : fixture;
  const sources = semanticDocument.sidecar.relations.flatMap((relation) => {
    if (relation.sourceRef === undefined) return [];
    return [
      {
        ...base.nodes[0]!,
        id: `source-${relation.displayName}`,
        name: relation.displayName!,
        metadata: {
          schema: 'raw',
          tableName: relation.displayName,
          connectedSourceRef: relation.sourceRef,
          columns: semanticDocument.sidecar.fields
            .filter((field) => field.relationId === relation.relationId)
            .map((field) => ({ name: field.displayName!, type: 'text' })),
        },
      },
    ];
  });
  const transform = {
    ...base.nodes[1]!,
    name: 'Orders + Client + Details',
    metadata: { transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument } },
  };
  const nodes = [...sources, transform];
  return {
    ...base,
    nodes,
    nodeIds: nodes.map((node) => node.id),
    nodePositions: Object.fromEntries(
      nodes.map((node, index) => [node.id, { x: index * 240, y: 0 }])
    ),
    edges: sources.map((source) => ({
      id: `${source.id}-transform`,
      sourceId: source.id,
      targetId: transform.id,
      relation: 'lineage',
    })),
  };
}
