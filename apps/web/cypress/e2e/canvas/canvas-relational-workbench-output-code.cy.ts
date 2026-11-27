/** Verify explicit SQL acquisition and responsive Code inspection. */
import {
  ConnectedSourceRefSchema,
  DvtTransformAuthoringAuthorityV1Schema,
  TransformSqlProjectionResponseSchema,
} from '@dvt/contracts';

import { getE2eApiCalls, stubE2eApi } from '../../support/e2eApiStub';
import { pressNativeKey } from '../../support/nativeKeyboard';
import {
  assertResponsiveCode,
  assertInspectorSqlEditorFits,
} from '../../support/relationalWorkbench/inspectorCodeLayout';
import {
  openWorkbenchModel,
  openWorkbenchProperties,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { moveWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';
import { E2E_WORKSPACE_SESSION } from '../../support/workspaceSession';

const SQL_ENDPOINT = '/workspace/graph/canvases/main-canvas/transforms/join-transform/sql';

function inspectModelOutputSql(): void {
  cy.get('[data-slot="canvas-relational-tree-workbench"] button[aria-label="Zoom out"]').click();
  moveWorkbenchCard('[data-slot="canvas-relational-tree-output-open"]', 0, 0);
  cy.get('[data-slot="canvas-model-output-inspector"]').within(() => {
    cy.get('[data-slot="canvas-operation-output-tab"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.then(() => expect(getE2eApiCalls(SQL_ENDPOINT, 'GET')).to.have.length(0));
    cy.get('[role="tablist"]').should('have.length', 1);
    cy.get('[data-slot="canvas-operation-sql-tab"]').click();
    cy.then(() => expect(getE2eApiCalls(SQL_ENDPOINT, 'GET')).to.have.length(0));
    cy.get('[data-slot="canvas-model-sql-edit"]').click();
    cy.root()
      .closest('[data-slot="canvas-model-editor"]')
      .find('[data-slot="canvas-model-toolbar"] button[aria-label="Collapse SQL panel"]')
      .click();
    cy.get('[data-slot="canvas-model-sql-output"] .monaco-editor')
      .should('be.visible')
      .and('contain.text', 'customers');
    cy.get('[data-slot="canvas-sql-presentation-selector"]').should('have.value', 'readable');
    cy.get('[data-slot="canvas-sql-presentation-result"]').should(
      'contain.text',
      'Simplification steps: 1.'
    );
    cy.get('[data-slot="canvas-sql-presentation-selector"]').select('original');
    cy.get('.monaco-editor').should('contain.text', 'result');
    cy.get('[data-slot="canvas-sql-presentation-selector"]').select('readable');
    cy.get('.monaco-editor').should('not.contain.text', 'result');
    cy.then(() => expect(getE2eApiCalls(SQL_ENDPOINT, 'GET')).to.have.length(1));
    cy.screenshot('model-output-sql-explicit');
    cy.get('[data-slot="canvas-operation-properties-tab"]').click();
  });
  cy.then(() => expect(getE2eApiCalls(SQL_ENDPOINT, 'GET')).to.have.length(1));
  cy.get(
    '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Fit graph to view"]'
  ).click();
  moveWorkbenchCard('[data-slot="canvas-relational-tree-output-open"]', 12, 8);
  cy.get('[data-slot="canvas-operation-properties-tab"]').should(
    'have.attr',
    'aria-selected',
    'true'
  );
  cy.then(() => expect(getE2eApiCalls(SQL_ENDPOINT, 'GET')).to.have.length(1));
  moveWorkbenchCard('[data-slot="canvas-relational-tree-output"]', 0, 0, undefined, undefined, {
    x: 0.8,
    y: 0.12,
  });
  cy.get('[data-slot="canvas-operation-output-tab"]').should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-operation-sql-tab"]').click();
  cy.get('[data-slot="canvas-model-sql-edit"]').should('be.enabled').click();
  cy.get('[data-slot="canvas-model-toolbar"] button[aria-label="Collapse SQL panel"]').click();
  cy.get('[data-slot="canvas-model-sql-output"] .monaco-editor').should('be.visible');
  moveWorkbenchCard('[data-slot="canvas-relational-tree-output-open"]', 0, 0);
  cy.then(() => {
    expect(getE2eApiCalls(SQL_ENDPOINT, 'GET')).to.have.length(2);
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
    expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
  });
  cy.get(
    '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-relational-collapse"]'
  ).click();
}

function assertCodeTabKeyboardNavigation(): void {
  cy.viewport(1024, 720);
  cy.get('[data-slot="dvt-transform-output-view-selector"]').focus().should('be.focused');
  cy.press(Cypress.Keyboard.Keys.TAB);
  cy.focused().closest('.monaco-editor').should('have.length', 1);
  cy.get('[data-slot="canvas-node-workbench-tabs-list"] [role="tab"]')
    .last()
    .should('have.attr', 'data-slot', 'canvas-node-workbench-tab-code');
  cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
  cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
  cy.get('[data-slot="canvas-node-workbench-code-content"] .monaco-editor')
    .should('be.visible')
    .and(($editor) => {
      expect($editor[0]!.getBoundingClientRect().height).to.be.at.least(160);
    });
}

function assertSimplificationTrace(): void {
  assertInspectorSqlEditorFits();
  cy.get(
    '[data-slot="canvas-node-workbench-code-content"] [data-slot="canvas-sql-trace-trigger"]'
  ).click();
  cy.get('[data-slot="canvas-sql-trace-content"]').should('be.visible');
  cy.press(Cypress.Keyboard.Keys.ESC);
  cy.get('[data-slot="canvas-sql-trace-content"]').should('not.exist');
  cy.get('[data-slot="canvas-sql-trace-trigger"]').should('be.focused');
  pressNativeKey('Enter');
  cy.get('[data-slot="canvas-sql-trace-content"]')
    .should('be.visible')
    .find('ol li')
    .should('have.length', 256);
  cy.viewport(1024, 600);
  assertInspectorSqlEditorFits();
  cy.get('[data-slot="canvas-node-workbench-panel"]').screenshot('inspector-derived-sql');
  pressNativeKey('Escape');
  cy.get('[data-slot="canvas-sql-trace-content"]').should('not.exist');
  cy.get('[data-slot="canvas-sql-trace-trigger"]').should('be.focused');
  cy.get('[data-slot="dvt-transform-output-view-selector"]').select('substrait');
  cy.get('[data-slot="canvas-node-workbench-code-content"] .view-lines').should(
    'contain.text',
    'schemaVersion'
  );
}

describe('Workbench SQL inspection', () => {
  let traceStepCount: number;
  beforeEach(() => {
    traceStepCount = 1;
    const draft = stubWorkbenchScenario('saved-join');
    const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
      draft.nodes.find((node) => node.id === 'join-transform')?.metadata?.transformAuthoring
    );
    const semanticPlanSha256 = authority.semanticDocument.semanticPlan.sha256;
    // This viewer proof consumes the server contract; SQL generation belongs to API proofs.
    stubE2eApi('GET', SQL_ENDPOINT, ({ url }) => {
      expect(Object.fromEntries(url.searchParams)).to.deep.equal({
        ...E2E_WORKSPACE_SESSION,
        semanticPlanSha256,
        presentation: 'readable',
      });
      return {
        body: TransformSqlProjectionResponseSchema.parse({
          schemaVersion: 'canvas-transform-sql-projection.v1',
          canvasId: 'main-canvas',
          transformNodeId: 'join-transform',
          draftRevision: 'rev-e2e-graph-ready',
          semanticPlanSha256,
          sql: 'SELECT result.customer_id FROM (SELECT customers.customer_id FROM public.customers INNER JOIN public.orders ON customers.customer_id = orders.customer_id) result',
          presentation: {
            status: 'rewritten',
            sql: 'SELECT customers.customer_id FROM public.customers INNER JOIN public.orders ON customers.customer_id = orders.customer_id',
            steps: Array.from({ length: traceStepCount }, (_, index) => ({
              rule: 'SQLREAD1.PROJECTION_FUSION',
              path: `$.SelectStmt.fromClause[${index}]`,
            })),
          },
          provenance: {
            sourceRefs: draft.nodes
              .filter((node) => node.metadata?.connectedSourceRef != null)
              .map((node) => ConnectedSourceRefSchema.parse(node.metadata?.connectedSourceRef)),
          },
        }),
      };
    });
  });
  it('acquires SQL explicitly in Model Output and keeps Code usable across viewport sizes', () => {
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    inspectModelOutputSql();
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    openWorkbenchProperties('join-transform');
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
    cy.get('[data-slot="canvas-node-workbench-code-content"]')
      .should('be.visible')
      .find('[data-slot="canvas-open-semantic-editor"]')
      .should('not.exist');
    assertResponsiveCode();
    assertCodeTabKeyboardNavigation();
    // Exercise the maximum declared trace without allowing details to collapse the editor.
    cy.then(() => {
      traceStepCount = 256;
    });
    cy.get('[data-slot="dvt-transform-output-view-selector"]').select('postgres-sql');
    cy.get('[data-slot="canvas-node-workbench-code-content"] [data-testid="monaco-code-viewer"]')
      .should('have.length', 1)
      .find('.view-lines')
      .should(($lines) => {
        expect($lines.text(), 'derived SQL uses the shared viewer').to.match(/\bselect\b/i);
      });
    cy.then(() => {
      expect(
        getE2eApiCalls(SQL_ENDPOINT, 'GET'),
        'two visible Model acquisitions and one explicit Code acquisition'
      ).to.have.length(3);
    });
    assertSimplificationTrace();
    cy.then(() => {
      expect(
        getE2eApiCalls('/workspace/graph/draft', 'PUT'),
        'inspection does not save the graph'
      ).to.have.length(0);
    });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
  });
  it('opens draft Output without replacing the operation editor or acquiring SQL', () => {
    const draftViewport = '[data-slot="canvas-relational-tree-draft-viewport"]:visible';
    const outputButton = `${draftViewport} [data-slot="canvas-relational-tree-output-open"]`;
    cy.viewport(1400, 900);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-edit"]:visible').click();
    cy.get('[data-slot="canvas-relational-tree-draft"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-inline-editor"]:visible').as('operationEditor', {
      type: 'static',
    });
    cy.get(draftViewport).parent().find('[data-slot="canvas-relational-tree-fit"]').click();
    cy.get(outputButton).click();
    cy.get('@operationEditor').should('not.be.visible');
    cy.get('[data-slot="canvas-model-output-inspector"]').within(() => {
      cy.get('[data-slot="canvas-operation-output-tab"]').should(
        'have.attr',
        'aria-selected',
        'true'
      );
      cy.get('[data-slot="relation-output-field"]:visible').should('have.length.at.least', 1);
      cy.get('[data-slot="canvas-operation-properties-tab"]').should('be.visible');
      cy.get('[data-slot="canvas-operation-sql-tab"]').click();
      cy.contains('Apply the model changes before generating SQL.').should('be.visible');
      cy.get('[data-slot="canvas-relational-collapse"]').click();
    });
    cy.get('@operationEditor').should('be.visible');
    cy.get(outputButton).focus();
    pressNativeKey('Enter');
    cy.get('[data-slot="canvas-model-output-inspector"]').should('be.visible');
    cy.get(
      '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-relational-collapse"]'
    ).click();
    cy.get(`${draftViewport} [data-slot="canvas-relational-output-edge-action"]`).focus();
    pressNativeKey('Enter');
    cy.get('[data-slot="canvas-model-output-inspector"]').should('not.exist');
    cy.press(Cypress.Keyboard.Keys.DELETE);
    cy.get(outputButton).click();
    cy.get('[data-slot="canvas-model-output-inspector"] [data-value="output"]:visible')
      .should('contain.text', 'No canonical relational tree is available.')
      .find('[data-slot="relation-output-field"]')
      .should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls(SQL_ENDPOINT, 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });
});
