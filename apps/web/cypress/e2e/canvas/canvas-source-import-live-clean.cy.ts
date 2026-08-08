/**
 * Owned concern: prove contextual Add Source against a live protected runtime
 * without draft endpoint intercepts or seeded draft success.
 */
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  clickPreviewExecutionPlanFromOperationalDrawer,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import {
  assertLiveFirstAuthoringDraftScopeIsClean,
  resolveLiveFirstAuthoringWorkspaceSession,
  skipWhenFirstAuthoringLiveEnvIsMissing,
} from '../../support/canvasFirstAuthoring';
import {
  connectCanvasNodes,
  getVisibleCanvasNodeByCardTitle,
  openNodeWorkbenchSection,
} from '../../support/canvasGraphAuthoring';
import { readLiveGraphDraft, readLiveWorkspaceFile } from '../../support/liveProtectedRuntime';
import {
  expectedLivePostgresSourceName,
  importLivePostgresSource,
} from '../../support/liveWarehouseSourceImport';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

function assertNoSeriousAccessibilityViolations(context: string): void {
  cy.get(context).should('be.visible');
  cy.injectAxe();
  cy.checkA11y(
    context,
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      includedImpacts: ['serious', 'critical'],
    },
    (violations) => {
      if (violations.length === 0) {
        return;
      }

      throw new Error(
        violations
          .map(
            (violation) =>
              `${violation.id}: ${violation.help} -> ${violation.nodes
                .map((node) => node.target.join(' '))
                .join(', ')}`
          )
          .join('\n')
      );
    }
  );
}

function visitCleanDbtCanvas(): void {
  const session = resolveLiveFirstAuthoringWorkspaceSession('dbt');

  cy.visit('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.clear();
      Object.defineProperty(window.navigator, 'language', {
        configurable: true,
        value: 'en-US',
      });
      window.document.documentElement.lang = 'en';
      seedE2eWorkspaceSession(window, session);
    },
  });
}

function waitForLiveDraftSaved(
  session: ReturnType<typeof resolveLiveFirstAuthoringWorkspaceSession>,
  remainingAttempts = 30
): Cypress.Chainable<void> {
  return readLiveGraphDraft(session, { failOnStatusCode: false }).then((draftResponse) => {
    if (draftResponse.status === 200) {
      expect(draftResponse.body).to.have.property('kind', 'ok');
      expect(draftResponse.body).to.have.nested.property('record.scope.tenantId', session.tenantId);
      expect(draftResponse.body).to.have.nested.property(
        'record.scope.projectId',
        session.projectId
      );
      expect(draftResponse.body).to.have.nested.property(
        'record.scope.environmentId',
        session.environmentId
      );

      return;
    }

    if (remainingAttempts <= 0) {
      throw new Error('Timed out waiting for the live graph draft save to be readable.');
    }

    expect(draftResponse.status).to.equal(404);
    return cy.wait(500).then(() => waitForLiveDraftSaved(session, remainingAttempts - 1));
  });
}

function waitForLiveDraftEdgeSaved(
  session: ReturnType<typeof resolveLiveFirstAuthoringWorkspaceSession>,
  remainingAttempts = 30
): Cypress.Chainable<void> {
  return readLiveGraphDraft(session).then((draftResponse) => {
    expect(draftResponse.status).to.equal(200);
    expect(draftResponse.body).to.have.nested.property('record.draft.edges');

    const edges = (
      draftResponse.body as {
        record: { draft: { edges: Array<{ sourceId: string; targetId: string }> } };
      }
    ).record.draft.edges;

    if (edges.length > 0) {
      return;
    }

    if (remainingAttempts <= 0) {
      const summary = JSON.stringify({
        edgeCount: edges.length,
        edges,
        nodeIds: (
          draftResponse.body as {
            record: { draft: { nodeIds?: string[] } };
          }
        ).record.draft.nodeIds,
      });
      throw new Error(
        `Timed out waiting for the live graph draft edge to be persisted: ${summary}`
      );
    }

    return cy.wait(500).then(() => waitForLiveDraftEdgeSaved(session, remainingAttempts - 1));
  });
}

function waitForLiveDraftModelSqlSaved(
  session: ReturnType<typeof resolveLiveFirstAuthoringWorkspaceSession>,
  expectedSql: string,
  remainingAttempts = 30
): Cypress.Chainable<void> {
  return readLiveGraphDraft(session).then((draftResponse) => {
    expect(draftResponse.status).to.equal(200);
    const nodes = (
      draftResponse.body as {
        record: {
          draft: {
            nodes: Array<{
              name: string;
              metadata?: { config?: { sql?: string } };
            }>;
          };
        };
      }
    ).record.draft.nodes;
    const modelSql = nodes.find((node) => node.name === 'Model 1')?.metadata?.config?.sql;

    if (modelSql === expectedSql) {
      return;
    }

    if (remainingAttempts <= 0) {
      throw new Error(
        `Timed out waiting for authored DBT SQL to persist. Last value: ${JSON.stringify(modelSql)}`
      );
    }

    return cy
      .wait(500)
      .then(() => waitForLiveDraftModelSqlSaved(session, expectedSql, remainingAttempts - 1));
  });
}

describe('Canvas source import live clean proof', () => {
  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) {
      return;
    }
  });

  it('imports a warehouse source, connects it to a dbt model, and previews without draft seeding', () => {
    const session = resolveLiveFirstAuthoringWorkspaceSession('dbt');
    const expectedSourceName = expectedLivePostgresSourceName();

    assertLiveFirstAuthoringDraftScopeIsClean('dbt');
    visitCleanDbtCanvas();

    cy.contains('Create canvas', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-playground-empty-state"]').within(() => {
      cy.contains('button', 'dbt').should('be.enabled').click();
    });

    cy.contains('Start dbt canvas', { timeout: 20_000 }).should('be.visible');
    waitForLiveDraftSaved(session);
    openCanvasContextMenuAt(420, 280);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('open-source-import', 'dbt:source');
    importLivePostgresSource();

    cy.contains('.react-flow__node', 'Postgres', { timeout: 20_000 })
      .should('be.visible')
      .and('contain.text', 'public')
      .and('contain.text', 'Columns')
      .and('contain.text', 'Rows')
      .and('contain.text', '3')
      .and('contain.text', 'Size')
      .and('contain.text', '32 KB')
      .and('contain.text', 'models/sources/src_public.yml');
    cy.contains('Stale version').should('not.exist');

    const runId = String(Cypress.env('firstAuthoringRunId') ?? 'source-import-live');
    const expectedConnectionName = `Live Postgres ${runId}`;
    const expectedConnectionId = `live-postgres-${runId}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    readLiveGraphDraft(session).then((draftResponse) => {
      expect(draftResponse.status).to.equal(200);
      const importedSource = (
        draftResponse.body as {
          record: {
            draft: {
              nodes: Array<{
                pluginId: string;
                metadata?: Record<string, unknown>;
              }>;
            };
          };
        }
      ).record.draft.nodes.find((node) => node.pluginId === 'dvt.warehouse-source');

      expect(importedSource?.metadata).to.have.nested.property(
        'connectedSourceRef.connectionRef.connectionId',
        expectedConnectionId
      );
      expect(importedSource?.metadata).to.have.nested.property(
        'connectedSourceRef.connectionRef.provider',
        'postgres'
      );
      expect(importedSource?.metadata).to.have.nested.property(
        'connectedSourceRef.sourceObjectId',
        'relation/dvt/public/source_1'
      );
      expect(importedSource?.metadata).not.to.have.property('sourceObjectId');
      expect(importedSource?.metadata).not.to.have.property('connectionType');
    });

    getVisibleCanvasNodeByCardTitle('Postgres')
      .find('[data-slot="graph-node-card-title"]')
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-panel"]', { timeout: 10_000 }).should('be.visible');
    openNodeWorkbenchSection('general');
    cy.get('[data-slot="canvas-node-workbench-general-section"]')
      .should('contain.text', 'Connection')
      .and('contain.text', expectedConnectionName)
      .and('contain.text', 'postgres')
      .and('contain.text', expectedConnectionId);
    cy.contains('[data-slot="canvas-node-workbench-general-section"] dt', 'Connection')
      .next('dd')
      .should('be.visible')
      .and(($value) => {
        const element = $value.get(0);
        expect(element.scrollWidth).to.be.at.most(element.clientWidth);
        expect(getComputedStyle(element).textOverflow).not.to.equal('ellipsis');
      });
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-node-workbench-panel"]');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');

    cy.contains('.react-flow__node', 'Postgres')
      .find('[data-slot="graph-node-operational-metric"]')
      .contains('Rows')
      .closest('[data-slot="graph-node-operational-metric"]')
      .should('have.attr', 'data-tone', 'warning')
      .find('[data-slot="graph-node-metric-hotspot"]')
      .trigger('pointermove', { pointerType: 'mouse' });
    cy.get('[data-slot="graph-node-metric-hotspot-detail"]', { timeout: 5_000 })
      .filter(':visible')
      .should('have.length', 1)
      .should('be.visible')
      .and('contain.text', 'Estimated using provider statistics')
      .and('contain.text', 'Confidence: medium')
      .and('contain.text', 'Snapshot observed:');

    cy.contains('.react-flow__node', 'Postgres')
      .find('[data-slot="graph-node-operational-metric"]')
      .contains('Size')
      .closest('[data-slot="graph-node-operational-metric"]')
      .should('have.attr', 'data-tone', 'success')
      .find('[data-slot="graph-node-metric-hotspot"]')
      .trigger('pointermove', { pointerType: 'mouse' });
    cy.get('[data-slot="graph-node-metric-hotspot-detail"]', { timeout: 5_000 })
      .filter(':visible')
      .should('have.length', 1)
      .should('be.visible')
      .and('contain.text', 'Measured using provider storage metadata')
      .and('contain.text', 'Physical allocation')
      .and('contain.text', 'Confidence: exact')
      .and('contain.text', 'Snapshot observed:');

    cy.contains('.react-flow__node', 'Postgres')
      .find('button[data-slot="graph-node-operational-rail"]')
      .click();
    cy.get('[data-slot="graph-node-health-popover"]')
      .should('be.visible')
      .and('have.focus')
      .and('contain.text', 'Columns')
      .and('contain.text', 'Allocated size')
      .and('contain.text', 'Observed')
      .and('not.contain.text', 'Avg row size');
    cy.focused().trigger('keydown', { key: 'Escape' });
    cy.get('[data-slot="graph-node-health-popover"]').should('not.exist');

    readLiveWorkspaceFile('models/sources/src_public.yml', session).then((sourceYamlResponse) => {
      expect(sourceYamlResponse.status).to.equal(200);
      const content = (sourceYamlResponse.body as { content: string }).content;

      expect(content).to.contain('schema: public');
      expect(content).to.contain(`name: ${expectedSourceName}`);
      expect(content).to.contain('name: source_1');
      expect(content).to.contain('order_id');
      expect(content).to.contain('customer');
      expect(content).to.contain('amount');
    });

    openCanvasContextMenuAt(740, 280);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('create-node', 'dbt:model');
    cy.contains('.react-flow__node', 'Model 1', { timeout: 20_000 }).should('be.visible');

    connectCanvasNodes('Postgres', 'Model 1');
    cy.contains('[role="alertdialog"]', 'Confirm Dependency', { timeout: 20_000 }).should(
      'be.visible'
    );
    cy.contains('[role="alertdialog"] button', 'Confirm').should('be.enabled').click();
    cy.contains('Dependency added', { timeout: 20_000 }).should('be.visible');
    waitForLiveDraftEdgeSaved(session);
    cy.get('.react-flow__edge', { timeout: 20_000 }).should('have.length.greaterThan', 0);

    getVisibleCanvasNodeByCardTitle('Model 1')
      .find('[data-slot="graph-node-card"]')
      .should('contain.text', 'Columns')
      .and('contain.text', '3');

    getVisibleCanvasNodeByCardTitle('Model 1')
      .find('[data-slot="graph-node-card"]')
      .click('center');
    cy.get('[data-slot="canvas-node-floating-toolbar"]')
      .should('be.visible')
      .and('have.attr', 'data-node-name', 'Model 1')
      .and('contain.html', 'svg')
      .and('have.text', '');
    cy.get('[data-slot="canvas-node-floating-toolbar"] button[data-toolbar-action="code"]')
      .should('have.attr', 'aria-label', 'Open node code')
      .trigger('pointermove', { pointerType: 'mouse' });
    cy.get('[data-slot="tooltip-content"]:visible', { timeout: 5_000 })
      .should('have.length', 1)
      .and('contain.text', 'Open the selected node code in its contextual workbench.');
    cy.get('[data-slot="canvas-node-floating-toolbar"] button[data-toolbar-action="freeze"]')
      .should('have.attr', 'aria-pressed', 'false')
      .click()
      .should('have.attr', 'aria-pressed', 'true')
      .and('have.attr', 'data-tone', 'active')
      .click()
      .should('have.attr', 'aria-pressed', 'false');
    cy.get('[data-slot="graph-node-health-popover"]').should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');

    getVisibleCanvasNodeByCardTitle('Postgres')
      .find('button[data-slot="graph-node-operational-rail"]')
      .click();
    cy.get('[data-slot="graph-node-health-popover"]').should('be.visible');
    cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    cy.focused().trigger('keydown', { key: 'Escape' });
    cy.get('[data-slot="graph-node-health-popover"]').should('not.exist');

    getVisibleCanvasNodeByCardTitle('Model 1')
      .find('[data-slot="graph-node-card-title"]')
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-panel"]', { timeout: 10_000 }).should('be.visible');
    cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');
    cy.get('[data-slot="graph-node-health-popover"]').should('not.exist');

    openNodeWorkbenchSection('columns');
    cy.get('[data-slot="canvas-node-workbench-columns-description"]')
      .should('contain.text', '3')
      .and('contain.text', 'inherited');
    cy.get('[data-slot="canvas-node-workbench-columns-section"]')
      .should('contain.text', 'order_id')
      .and('contain.text', 'customer')
      .and('contain.text', 'amount');

    openNodeWorkbenchSection('code');
    const authoredModelSql = `select order_id, customer\nfrom {{ source('${expectedSourceName}', 'source_1') }}`;
    cy.get('[data-slot="canvas-node-workbench-code-section"]')
      .should('not.contain.text', 'No SQL or generated code is recorded for this node.')
      .within(() => {
        cy.get('[data-slot="dbt-model-code-provenance"]')
          .should('contain.text', 'models/model_1.sql')
          .and('contain.text', 'Generated');
        cy.get('textarea[name="dbt-model-sql"]')
          .should('be.visible')
          .and('contain.value', `{{ source('${expectedSourceName}', 'source_1') }}`)
          .focus()
          .type('{selectall}{backspace}')
          .should('have.value', '')
          .type(authoredModelSql, { parseSpecialCharSequences: false });
        cy.get('[data-slot="dbt-model-code-provenance"]').should('contain.text', 'Authored');
        cy.contains('button', 'Apply').should('be.enabled').click();
      });
    waitForLiveDraftModelSqlSaved(session, authoredModelSql);
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');

    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.contains('Execution Preview', { timeout: 30_000 }).should('be.visible');
    cy.contains('Execution Preview identity').should('be.visible');
    cy.contains('Persistence evidence').scrollIntoView().should('be.visible');

    readLiveWorkspaceFile('models/model_1.sql', session).then((modelSqlResponse) => {
      expect(modelSqlResponse.status).to.equal(200);
      const content = (modelSqlResponse.body as { content: string }).content;

      expect(content).to.contain("{{ config(materialized='view') }}");
      expect(content).to.contain(authoredModelSql);
    });

    cy.get('[data-testid="plan-preview-modal"]')
      .should('be.visible')
      .within(() => {
        cy.contains('button', 'Close').click();
      });
    cy.get('[data-testid="plan-preview-modal"]').should('not.exist');
    cy.get('body').should('not.have.css', 'pointer-events', 'none');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]')
      .scrollIntoView()
      .should(($command) => {
        expect($command).to.be.visible;
        expect($command).not.to.have.attr('data-disabled');
      })
      .click();
    cy.contains('Project code', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="code-workspace-file-entry"][data-workspace-path="models/model_1.sql"]')
      .should('be.visible')
      .click();
    cy.get('textarea[aria-label*="model_1.sql"], [role="textbox"][aria-label*="model_1.sql"]', {
      timeout: 20_000,
    }).should('exist');
  });
});
