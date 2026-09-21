/** Owns a discriminating LEFT JOIN fixture and its real workspace import. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';

import documents from '../../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json';
import {
  addDvtSubstraitJoinPredicateCondition,
  setDvtSubstraitJoinType,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { exportProjectSnapshot } from '../../../src/app/views/canvas/canvasProjectSnapshot';
import { buildCanvasAuthoringDraft } from '../canvasDraftAuthoring';
import { getVisibleCanvasNode } from '../canvasExecutionSelection';
import {
  resolveLiveWorkspaceSession,
  visitWithLiveWorkspaceSession,
} from '../liveProtectedRuntime';

export const modelId = 'semantic-live-model';
export const resultRelation = 'semantic_live_result';
export const expectedColumns = ['order_id', 'client_id', 'client_client_id', 'country'];
export const expectedSortedRows = [
  ['3', 'C-001', 'C-001', 'ES'],
  ['2', 'C-014', null, null],
  ['1', 'C-001', 'C-001', 'ES'],
];
export const expectedRows = expectedSortedRows.slice(0, 2);

export function leftJoinDocument(): DvtSubstraitSemanticDocumentV1 {
  const draft = decodeDvtSubstraitSemanticDocument(documents.two);
  const joinRelationId = draft.sidecar.relations.find(
    (relation) => !('sourceRef' in relation)
  )!.relationId;
  const country = draft.sidecar.fields.find(
    (field) => field.displayName === 'country' && !('sourceFieldId' in field)
  )!;
  return encodeDvtSubstraitSemanticDocument(
    addDvtSubstraitJoinPredicateCondition({
      draft: setDvtSubstraitJoinType({ draft, joinRelationId, joinType: JoinRel_JoinType.LEFT }),
      joinRelationId,
      condition: {
        operator: 'equal',
        left: { kind: 'field', sourceFieldId: country.fieldId },
        right: { kind: 'literal', literal: { dataType: 'string', value: 'ES' } },
      },
    })
  );
}

export function visitSemanticCanvas(): void {
  visitWithLiveWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
}

export function importSemanticModel(document: DvtSubstraitSemanticDocumentV1): void {
  const schema: unknown = Cypress.env('postgresTargetSchema');
  if (typeof schema !== 'string' || !schema.trim())
    throw new Error('Isolated PostgreSQL target schema is required');
  const base = buildCanvasAuthoringDraft({
    authoringGenerated: true,
    terminalTransformPreview: true,
  });
  const sourceTemplate = base.nodes.find((node) => node.role === 'input')!;
  const transformTemplate = base.nodes.find((node) => node.role === 'transform')!;
  const sources = document.sidecar.relations.flatMap((relation) =>
    !('sourceRef' in relation)
      ? []
      : [
          {
            ...sourceTemplate,
            id: `source-${relation.displayName}`,
            name: relation.displayName,
            metadata: {
              schema: 'raw',
              tableName: relation.displayName,
              connectedSourceRef: relation.sourceRef,
              columns: document.sidecar.fields
                .filter((field) => field.relationId === relation.relationId)
                .map((field) => ({ name: field.displayName, type: 'text' })),
            },
          },
        ]
  );
  const model = {
    ...transformTemplate,
    id: modelId,
    name: 'Ordered European clients',
    metadata: {
      config: {
        materialized: 'table',
        resultTarget: {
          schemaVersion: 'dvt-transform-result-target.v1',
          connectionRef: sources[0]!.metadata.connectedSourceRef.connectionRef,
          schema,
          relation: resultRelation,
        },
      },
      transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument: document },
    },
  };
  const nodes = [...sources, model];
  const draft = {
    ...base,
    nodes,
    nodeIds: nodes.map((node) => node.id),
    nodePositions: Object.fromEntries(
      nodes.map((node, index) => [
        node.id,
        { x: index === 2 ? 550 : 40, y: index === 2 ? 150 : 40 + index * 220 },
      ])
    ),
    edges: sources.map((source) => ({
      id: `${source.id}-model`,
      sourceId: source.id,
      targetId: modelId,
      relation: 'lineage' as const,
    })),
  };
  const contents = exportProjectSnapshot({
    record: { draft, revision: 'initial', savedAt: '2026-09-21T00:00:00.000Z' },
    workspaceScope: { ...resolveLiveWorkspaceSession(), targetAdapter: 'temporal' },
    exportedAt: '2026-09-21T00:00:00.000Z',
  }).contents;
  cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
  cy.get('[data-slot="canvas-workspace-import-input"]').selectFile(
    {
      contents: Cypress.Buffer.from(contents),
      fileName: 'semantic-live.json',
      mimeType: 'application/json',
    },
    { force: true }
  );
  cy.get('body').type('{esc}');
  getVisibleCanvasNode(modelId).should('be.visible');
}
