/** Formula authoring -> protected persistence -> reopened inspection -> real PostgreSQL rows. */
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';

import { encodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { createCanvasRelationalTreeProjectionDraft } from '../../../src/app/views/canvas/canvasRelationalTreeProjectionAuthoring';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  seedLiveSelectedClosureDraft,
} from '../../support/liveProtectedRuntime';
import {
  authorLineageFormula,
  inspectLineageOutput,
} from '../../support/relationalWorkbench/formulaLineageJourney';
import { readPersistedDocument } from '../../support/semanticLive/canonicalAssertions';
import {
  importSemanticModel,
  modelId,
  visitSemanticCanvas,
} from '../../support/semanticLive/fixture';

describe('Live nested formula lineage', () => {
  beforeEach(function () {
    if (Cypress.env('apiBaseUrl') == null && Cypress.env('apiBearerToken') == null) this.skip();
    expect(hasLiveProtectedRuntimeEnv(), 'Requires protected live runner').to.equal(true);
    resetE2eApiStubs();
  });

  it('authors nested two-field output, reopens its identity and previews real rows', () => {
    cy.viewport(1200, 600);
    seedLiveSelectedClosureDraft({ emptyCanvas: true });
    visitSemanticCanvas();
    const initial = encodeDvtSubstraitSemanticDocument(
      createCanvasRelationalTreeProjectionDraft({
        targetNodeId: modelId,
        input: {
          nodeId: 'source-client',
          schema: 'raw',
          table: 'client',
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            sourceObjectId: 'relation/dvt/raw/client',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              provider: 'postgres',
              connectionId: 'local-postgres-proof',
            },
          },
          fields: ['client_id', 'country'].map((name) => ({
            name,
            dataType: 'string',
            joinDataType: 'string',
            nullable: true,
          })),
        },
      })
    );
    importSemanticModel(initial, {
      name: 'Nested formula proof',
      resultRelation: 'nested_formula_proof',
    });
    let samples = 0;
    let runs = 0;
    cy.intercept('GET', `**/transforms/${modelId}/data-sample?*`, (request) => {
      samples += 1;
      request.continue();
    }).as('rows');
    cy.intercept('POST', '**/runs/start', (request) => {
      runs += 1;
      request.continue();
    });
    authorLineageFormula(modelId, 'COALESCE(TRIM(client_id), country)');
    let persisted: DvtSubstraitSemanticDocumentV1;
    readPersistedDocument(initial.semanticPlan.sha256).then((document) => {
      persisted = document;
      const field = document.sidecar.fields.find((entry) => entry.displayName === 'preferred_name');
      expect(field?.operandFieldIds).to.have.length(2);
      expect(samples, 'Authoring does not query data').to.equal(0);
    });
    visitSemanticCanvas();
    readPersistedDocument().then((document) => expect(document).to.deep.equal(persisted));
    inspectLineageOutput(modelId, 'coalesce(trim(client_id), country)');
    cy.get('[data-slot="canvas-contextual-workbench-close"]').click();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get(`.react-flow__node[data-id="${modelId}"] [data-slot="canvas-node-execute"]`)
      .focus()
      .should('be.enabled')
      .and('have.css', 'opacity', '1');
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.wait('@rows', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(200);
      expect(response!.body.semanticPlanSha256).to.equal(persisted.semanticPlan.sha256);
      expect(response!.body.columns.map((column: { name: string }) => column.name)).to.deep.equal([
        'client_id',
        'country',
        'preferred_name',
      ]);
      expect(
        response!.body.rows.map((row: { values: unknown[] }) => row.values).sort()
      ).to.deep.equal([
        ['C-001', 'ES', 'C-001'],
        ['C-014', 'US', 'C-014'],
      ]);
    });
    cy.get('[data-slot="bottom-operational-data-table"] thead [data-column-id]').should(
      'have.length',
      3
    );
    cy.get('[data-slot="bottom-operational-data-table"] tbody tr').should('have.length', 2);
    cy.screenshot('nested-formula-real-preview', { capture: 'viewport', scale: true });
    cy.then(() => expect(runs, 'Preview never starts a Run').to.equal(0));
  });
});
