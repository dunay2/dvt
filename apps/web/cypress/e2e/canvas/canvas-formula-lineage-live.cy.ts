/**
 * Owned concern: prove persisted formula dependencies, reopened identity and real PostgreSQL rows.
 * @baseline GH-3593: public outputs forward producer identities instead of owning operand metadata.
 * @decision Resolve canonical expression references against the persisted Transform input scope.
 * @consequence Two-field lineage is proven by exact identities, independently of sidecar ordering.
 * @version 1.0.0
 */
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { createCanvasRelationalTreeProjectionDraft } from '../../../src/app/views/canvas/canvasRelationalTreeProjectionAuthoring';
import { readCanvasTransformDependencyModel } from '../../../src/app/views/canvas/canvasTransformDependencyModel';
import { transformExpressionDependencies } from '../../../src/app/views/canvas/canvasTransformExpressionReferences';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import { seedLiveSelectedClosureDraft } from '../../support/liveCanvasDraftAuthoring';
import { hasLiveProtectedRuntimeEnv } from '../../support/liveProtectedRuntime';
import { livePostgresDatabaseName } from '../../support/liveWarehouseSourceImport';
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
            sourceObjectId: `relation/${livePostgresDatabaseName()}/raw/client`,
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
      const indexed = indexSubstraitRelations(decodeDvtSubstraitSemanticDocument(document));
      if (!indexed.ok) throw indexed.error;
      const dependencies = readCanvasTransformDependencyModel(
        indexed.index.relations.get(indexed.index.rootId)!,
        (id) => indexed.index.relations.get(id)!
      );
      const definition = dependencies.definitions.find(
        (entry) => entry.output?.displayName === 'preferred_name'
      );
      if (definition?.output == null)
        throw new Error('Expected published preferred_name definition');
      const inputIds = ['client_id', 'country'].map((name) => {
        const field = dependencies.input.fields.find((entry) => entry.displayName === name);
        if (field == null) throw new Error(`Expected persisted input ${name}`);
        return field.fieldId;
      });
      expect(definition.output.relationId).to.equal(indexed.index.rootId);
      expect(
        transformExpressionDependencies(definition.expression, definition.inputIds)
      ).to.have.members(inputIds);
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
