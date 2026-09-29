/** Scenario setup only: formulas and aggregate edits are authored by the live browser. */
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';
import { selectDvtSubstraitRelation } from '@dvt/substrait-analysis';

import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { CanvasRelationAnalysisSession } from '../../../src/app/views/canvas/canvasRelationAnalysisSession';
import { insertSelectedRelationTransform } from '../../../src/app/views/canvas/canvasSelectedRelationTransform';

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
  cy.wait('@saveDraft').its('response.statusCode').should('eq', 200);
  cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
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
      ['unmatched', "country IS NULL OR client_id = 'C-001'"],
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
      ['1', 'C-001', 'C-001', 'ES', 'C-001/ES', '10', 'true'],
      ['2', 'C-014', null, null, 'C-014/UNKNOWN', '10', 'true'],
      ['3', 'C-001', 'C-001', 'ES', 'C-001/ES', '10', 'true'],
    ],
  },
  {
    level: 3,
    formulas: [
      ['region', "COALESCE(country, 'UNKNOWN')"],
      ['line_total', '12.5 * 2.0'],
    ],
    columns: ['region', 'revenue', 'rank'],
    rows: [['ES', '50', '2']],
  },
] as const;
