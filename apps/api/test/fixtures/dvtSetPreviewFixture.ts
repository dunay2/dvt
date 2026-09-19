/** Canonical UNION DISTINCT document exported by the Canvas SetRel authoring path. */
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
      '../../../../packages/@dvt/postgres-projection/test/fixtures/set-documents.json',
      import.meta.url
    ),
    'utf8'
  )
) as Record<string, unknown>;

export function buildDvtSetPreviewDraft(): WorkspaceGraphAuthoringDraft {
  const base = buildDvtTerminalTransformPreviewDraft();
  const semanticDocument = DvtSubstraitSemanticDocumentV1Schema.parse(documents['unionDistinct']);
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
