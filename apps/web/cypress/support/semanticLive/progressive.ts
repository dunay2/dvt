/** Scenario setup only: formulas and aggregate edits are authored by the live browser. */
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';
import { selectDvtSubstraitRelation } from '@dvt/substrait-analysis';

import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { CanvasRelationAnalysisSession } from '../../../src/app/views/canvas/canvasRelationAnalysisSession';
import { insertSelectedRelationTransform } from '../../../src/app/views/canvas/canvasSelectedRelationTransform';
import { readLiveGraphDraft } from '../liveProtectedRuntime';

import { leftJoinDocument, modelId } from './fixture';

export async function progressiveDocument(level: number): Promise<DvtSubstraitSemanticDocumentV1> {
  const join = decodeDvtSubstraitSemanticDocument(await leftJoinDocument());
  const client = join.sidecar.relations.find((relation) => relation.displayName === 'client')!;
  const session = new CanvasRelationAnalysisSession(modelId);
  session.receive(level === 1 ? selectDvtSubstraitRelation(join, client.relationId) : join);
  try {
    const { document } = await insertSelectedRelationTransform(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
    });
    return encodeDvtSubstraitSemanticDocument(document);
  } finally {
    session.dispose();
  }
}

export function addLiveFormula(alias: string, formula: string): void {
  let previousRevision: string;
  readLiveGraphDraft().then(({ body }) => {
    previousRevision = body.record.revision;
  });
  cy.get(
    '[data-slot="canvas-transform-inspector"] [data-slot="canvas-derived-output-trigger"]'
  ).click();
  cy.get('[data-slot="canvas-derived-output-form"]').within(() => {
    cy.get('input[name="alias"]').type(alias);
    cy.get('[data-slot="formula-editor"] .monaco-editor textarea').type(formula, { force: true });
    cy.get('.formula-result').should('be.visible');
    cy.get('[data-slot="formula-editor"] .squiggly-error').should('not.exist');
    cy.get('button[type="submit"]').should('be.enabled').click();
  });
  cy.get('[data-slot="canvas-derived-output-form"]').should('not.exist');
  cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
  readLiveGraphDraft().then(({ body }) => {
    expect(body.record.revision, 'Formula is durably saved').not.to.equal(previousRevision);
  });
}

export const progressiveScenarios = [
  {
    level: 1,
    formulas: [
      ['CAMPO_PRUEBA', 'COALESCE(UPPER(TRIM(client_id)), NULL)'],
      ['hola', "''"],
      ['missing', 'NULL'],
    ],
    columns: ['client_id', 'country', 'CAMPO_PRUEBA', 'hola', 'missing'],
    rows: [
      ['C-001', 'ES', 'C-001', '', null],
      ['C-014', 'US', 'C-014', '', null],
    ],
  },
  {
    level: 2,
    formulas: [
      ['label', "CONCAT_WS('/', client_id, COALESCE(country, 'UNKNOWN'))"],
      ['line_total', '(2.5 + 2.5) * 2.0'],
      ['unmatched', "(country IS NULL OR client_id = 'C-999') AND client_id <> ''"],
    ],
    columns: [
      'order_id',
      'client_id',
      'client_client_id',
      'country',
      'label',
      'line_total',
      'unmatched',
    ],
    rows: [
      ['1', 'C-001', 'C-001', 'ES', 'C-001/ES', '10', 'false'],
      ['2', 'C-014', null, null, 'C-014/UNKNOWN', '10', 'true'],
      ['3', 'C-001', 'C-001', 'ES', 'C-001/ES', '10', 'false'],
    ],
  },
  {
    level: 3,
    formulas: [
      ['region', "COALESCE(country, 'UNKNOWN')"],
      ['unit_price', '12.5'],
      ['quantity', '2.0'],
      ['line_total', 'unit_price * quantity'],
    ],
    columns: ['region', 'revenue', 'rank'],
    rows: [['ES', '50', '2']],
  },
] as const;
