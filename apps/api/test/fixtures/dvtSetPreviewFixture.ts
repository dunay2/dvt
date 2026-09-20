/** Canonical SetRel documents exported by the Canvas authoring path. */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  DvtSubstraitSemanticDocumentV1Schema,
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { buildDvtTerminalTransformPreviewDraft } from './workspaceGraphDraftFixture.js';

const documents = JSON.parse(
  readFileSync(
    new URL(
      '../../../../packages/@dvt/postgres-projection/test/fixtures/set-documents.json',
      import.meta.url
    ),
    'utf8'
  )
) as Record<string, unknown>;

export function buildDvtSetPreviewDraft(
  wrapper?: 'aggregate' | 'window',
  operation: 'union_distinct' | 'intersect_distinct' | 'except_distinct' = 'union_distinct',
  projectFirstColumn = false
): WorkspaceGraphAuthoringDraft {
  const base = buildDvtTerminalTransformPreviewDraft();
  const fixtureName =
    wrapper === 'aggregate'
      ? 'unionDistinctAggregate'
      : wrapper === 'window'
        ? 'unionDistinctWindow'
        : 'unionDistinct';
  const baseDocument = DvtSubstraitSemanticDocumentV1Schema.parse(documents[fixtureName]);
  const plan = decodeDvtSubstraitPlanV1(baseDocument);
  const root = plan.relations[0]?.relType;
  const relation = root?.case === 'root' ? root.value.input?.relType : undefined;
  const set =
    relation?.case === 'set'
      ? relation
      : relation?.case === 'aggregate'
        ? relation.value.input?.relType
        : relation?.case === 'project' && relation.value.input?.relType.case === 'aggregate'
          ? relation.value.input.relType.value.input?.relType
          : undefined;
  if (set?.case !== 'set') throw new Error('Set preview fixture must contain one SetRel.');
  set.value.op = {
    union_distinct: SetRel_SetOp.UNION_DISTINCT,
    intersect_distinct: SetRel_SetOp.INTERSECTION_MULTISET,
    except_distinct: SetRel_SetOp.MINUS_PRIMARY,
  }[operation];
  let sidecar = baseDocument.sidecar;
  if (projectFirstColumn) {
    if (wrapper != null || root?.case !== 'root' || set.value.common?.emitKind.case !== 'emit') {
      throw new Error('Projected Set fixture requires one unwrapped SetRel root.');
    }
    set.value.common.emitKind.value.outputMapping = [0];
    root.value.names = [root.value.names[0]!];
    const resultBinding = sidecar.relations.find(
      (relation) => relation.relAnchor === set.value.common?.relAnchor
    );
    if (resultBinding == null) throw new Error('Set preview fixture requires a result binding.');
    sidecar = {
      ...sidecar,
      fields: sidecar.fields.filter(
        (field) => field.relationId !== resultBinding.relationId || field.outputOrdinal === 0
      ),
    };
  }
  const semanticPlan = encodeDvtSubstraitPlanV1(plan);
  const semanticDocument = DvtSubstraitSemanticDocumentV1Schema.parse({
    ...baseDocument,
    semanticPlan,
    sidecar: { ...sidecar, semanticPlanSha256: semanticPlan.sha256 },
  });
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
    id: 'transform-customers',
    name: 'Distinct customers',
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
