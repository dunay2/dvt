/** Canonical grouped LEFT JOIN documents exported by the real Canvas constructors. */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  DvtSubstraitSemanticDocumentV1Schema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { buildDvtJoinPreviewDraft } from './dvtJoinPreviewFixture.js';

export function buildDvtGroupedLeftJoinDraft(
  wrapper: 'aggregate' | 'window'
): WorkspaceGraphAuthoringDraft {
  const name = wrapper === 'aggregate' ? 'grouped' : 'windowed';
  const semanticDocument = DvtSubstraitSemanticDocumentV1Schema.parse(
    JSON.parse(
      readFileSync(
        new URL(
          `../../../../packages/@dvt/postgres-projection/test/fixtures/${name}-left-join-document.json`,
          import.meta.url
        ),
        'utf8'
      )
    )
  );
  const base = buildDvtJoinPreviewDraft(2, 'left');
  return {
    ...base,
    nodes: base.nodes.map((node) => {
      if (node.role === 'transform') {
        return {
          ...node,
          metadata: {
            ...node.metadata,
            transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument },
          },
        };
      }
      const relation = semanticDocument.sidecar.relations.find(
        (binding) => binding.sourceRef?.sourceObjectId === `public.${node.metadata?.['tableName']}`
      );
      if (relation?.sourceRef == null) throw new Error(`Missing canonical source: ${node.id}`);
      return {
        ...node,
        metadata: {
          ...node.metadata,
          schema: 'public',
          connectedSourceRef: relation.sourceRef,
          columns: semanticDocument.sidecar.fields
            .filter((field) => field.relationId === relation.relationId)
            .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
            .map((field) => ({ name: field.displayName!, type: 'text' })),
        },
      };
    }),
  };
}
