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

describe('Canvas source import live clean proof', () => {
  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) {
      return;
    }
  });

  it('imports a warehouse source, connects it to a dbt model, and previews without draft seeding', () => {
    const session = resolveLiveFirstAuthoringWorkspaceSession('dbt');
    const expectedSourceName = expectedLivePostgresSourceName();
    const runId = String(Cypress.env('firstAuthoringRunId') ?? 'source-import-live');
    const secondaryConnectionSuffix = 'Secondary';
    const expectedConnectionName = `Live Postgres ${runId}`;
    const expectedSecondaryConnectionName = `${expectedConnectionName} ${secondaryConnectionSuffix}`;
    const toExpectedConnectionId = (name: string): string =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const expectedConnectionId = toExpectedConnectionId(expectedConnectionName);
    const expectedSecondaryConnectionId = toExpectedConnectionId(expectedSecondaryConnectionName);
    const readRequiredScopeEnv = (name: string): string => {
      const value = Cypress.env(name);
      expect(value, `Cypress env ${name}`).to.be.a('string');
      const normalized = String(value).trim();
      expect(normalized, `Cypress env ${name}`).not.to.equal('');
      return normalized;
    };
    const secondarySession = {
      tenantId: readRequiredScopeEnv('secondaryWorkspaceTenantId'),
      projectId: readRequiredScopeEnv('secondaryWorkspaceProjectId'),
      environmentId: readRequiredScopeEnv('secondaryWorkspaceEnvironmentId'),
    };
    const selectWorkspaceScope = (
      scope: typeof secondarySession,
      copy: Readonly<{ availableProjects: string; projectPrefix: string }>
    ): void => {
      cy.get('[data-slot="shell-workspace-menu-trigger"]', { timeout: 20_000 })
        .should('be.visible')
        .and('be.enabled')
        .click();
      cy.get('[data-slot="shell-workspace-scope-selector"]')
        .should('be.visible')
        .and('contain.text', copy.availableProjects);
      cy.get('[data-slot="shell-workspace-scope-selector"] button[aria-pressed="false"]', {
        timeout: 20_000,
      })
        .should('have.length', 1)
        .should('be.visible')
        .focus()
        .should('be.focused');
      cy.press(Cypress.Keyboard.Keys.ENTER);
      cy.get('[data-slot="shell-workspace-menu-trigger"]', { timeout: 20_000 }).should(
        'contain.text',
        `${copy.projectPrefix}: ${scope.projectId}`
      );
    };
    const assertPresentedWorkspaceFileContent = (
      expectedContent: string,
      forbiddenContent: string
    ): void => {
      cy.get('[data-slot="shell-workspace-menu-trigger"]')
        .should('be.visible')
        .and('be.enabled')
        .click();
      cy.get('[data-slot="canvas-workspace-open-project-code-command"]')
        .scrollIntoView()
        .should('be.visible')
        .focus()
        .should('be.focused');
      cy.press(Cypress.Keyboard.Keys.ENTER);
      cy.get(
        '[data-slot="code-workspace-file-entry"][data-workspace-path="models/sources/src_public.yml"]',
        { timeout: 20_000 }
      )
        .should('be.visible')
        .focus()
        .should('be.focused');
      cy.press(Cypress.Keyboard.Keys.ENTER);
      cy.get('[data-testid="monaco-code-editor"], [data-testid="monaco-code-viewer"]', {
        timeout: 20_000,
      })
        .find('.view-line')
        .should(($lines) => {
          const presentedContent = [...$lines]
            .map((line) => (line.textContent ?? '').replaceAll('\u00a0', ' '))
            .join('\n');
          const normalizedPresentedContent = presentedContent.replace(/\s+/g, '');
          expect(normalizedPresentedContent).to.contain(expectedContent.replace(/\s+/g, ''));
          expect(normalizedPresentedContent).not.to.contain(forbiddenContent.replace(/\s+/g, ''));
        });
      cy.get('[data-slot="canvas-contextual-workbench-close"]').should('be.visible').click();
      cy.get('[data-slot="canvas-contextual-workbench"]').should('not.exist');
      cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.focused');
    };
    const scopeBConnectionSuffix = 'Scope B';
    const expectedScopeBSourceName = expectedLivePostgresSourceName(scopeBConnectionSuffix);
    const expectedScopeBConnectionId = toExpectedConnectionId(
      `${expectedConnectionName} ${scopeBConnectionSuffix}`
    );
    const viewportMatrix = [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 1000, height: 660 },
      { width: 500, height: 330 },
    ] as const;

    assertLiveFirstAuthoringDraftScopeIsClean('dbt');
    visitCleanDbtCanvas();

    cy.contains('Create canvas', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-playground-empty-state"]').within(() => {
      cy.contains('button', 'dbt').should('be.enabled').click();
    });

    cy.get('[data-testid="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-empty-state"]').should('not.exist');
    waitForLiveDraftSaved(session);
    openCanvasContextMenuAt(420, 280);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('open-source-import', 'dvt:source');
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

    openCanvasContextMenuAt(820, 500);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('open-source-import', 'dvt:source');
    importLivePostgresSource({ kind: 'graph-draft' }, secondaryConnectionSuffix);

    readLiveGraphDraft(session).then((draftResponse) => {
      expect(draftResponse.status).to.equal(200);
      const importedSources = (
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
      ).record.draft.nodes.filter((node) => node.pluginId === 'dvt.warehouse-source');

      expect(importedSources).to.have.length(2);
      expect(
        importedSources.map((node) => node.metadata?.connectedSourceRef)
      ).to.deep.include.members([
        {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: expectedConnectionId,
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/public/source_1',
        },
        {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: expectedSecondaryConnectionId,
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/public/source_1',
        },
      ]);
      for (const importedSource of importedSources) {
        expect(importedSource.metadata).not.to.have.property('sourceObjectId');
        expect(importedSource.metadata).not.to.have.property('connectionType');
      }
    });

    openCanvasContextMenuAt(640, 420);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('open-source-import', 'dvt:source');
    for (const viewport of viewportMatrix) {
      cy.viewport(viewport.width, viewport.height);
      cy.contains('[role="dialog"]', 'Add source', { timeout: 20_000 })
        .should('be.visible')
        .should(($dialog) => {
          const bounds = $dialog.get(0).getBoundingClientRect();
          expect(bounds.left).to.be.at.least(0);
          expect(bounds.top).to.be.at.least(0);
          expect(bounds.right).to.be.at.most(viewport.width);
          expect(bounds.bottom).to.be.at.most(viewport.height);
        });
      cy.get('[data-slot="source-import-wizard-content-scroll"]').should('be.visible');
      cy.contains('[role="dialog"] button', 'Cancel').should('be.visible').and('be.enabled');
    }
    cy.contains('[role="dialog"] button', 'Cancel').click();
    cy.contains('[role="dialog"]', 'Add source').should('not.exist');
    readLiveGraphDraft(session).then((draftResponse) => {
      const importedSources = (
        draftResponse.body as {
          record: { draft: { nodes: Array<{ pluginId: string }> } };
        }
      ).record.draft.nodes.filter((node) => node.pluginId === 'dvt.warehouse-source');
      expect(importedSources).to.have.length(2);
    });
    cy.viewport(1000, 660);

    cy.get('button.react-flow__controls-fitview').should('be.visible').click();
    cy.get('[data-slot="graph-node-card-title"]', { timeout: 20_000 })
      .filter((_, element) => (element.textContent ?? '').includes('Postgres'))
      .should('have.length', 2)
      .first()
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-panel"]', { timeout: 10_000 }).should('be.visible');
    openNodeWorkbenchSection('general');
    cy.get('[data-slot="canvas-node-workbench-general-section"]')
      .should('contain.text', 'Connection')
      .and('contain.text', expectedConnectionName)
      .and('contain.text', 'postgres')
      .and('contain.text', expectedConnectionId);
    for (const viewport of viewportMatrix) {
      cy.viewport(viewport.width, viewport.height);
      cy.get('[data-slot="canvas-node-workbench-overlay"]')
        .should('be.visible')
        .should(($overlay) => {
          const bounds = $overlay.get(0).getBoundingClientRect();
          expect(bounds.left).to.be.at.least(0);
          expect(bounds.top).to.be.at.least(0);
          expect(bounds.right).to.be.at.most(viewport.width);
          expect(bounds.bottom).to.be.at.most(viewport.height);
        });
      cy.contains('[data-slot="canvas-node-workbench-general-section"] dt', 'Connection')
        .next('dd')
        .scrollIntoView()
        .should('be.visible');
      cy.get('[data-slot="canvas-node-workbench-close"]').should('be.visible').and('be.enabled');
    }
    cy.viewport(1000, 660);
    cy.contains('[data-slot="canvas-node-workbench-general-section"] dt', 'Connection')
      .next('dd')
      .scrollIntoView()
      .should('be.visible')
      .and(($value) => {
        const element = $value.get(0);
        expect(element.scrollWidth).to.be.at.most(element.clientWidth);
        expect(getComputedStyle(element).textOverflow).not.to.equal('ellipsis');
      });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');

    cy.get('[data-slot="graph-node-card-title"]', { timeout: 20_000 })
      .filter((_, element) => (element.textContent ?? '').includes('Postgres'))
      .should('have.length', 2)
      .last()
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-panel"]', { timeout: 10_000 }).should('be.visible');
    openNodeWorkbenchSection('general');
    cy.get('[data-slot="canvas-node-workbench-general-section"]')
      .should('contain.text', 'Connection')
      .and('contain.text', expectedSecondaryConnectionName)
      .and('contain.text', 'postgres')
      .and('contain.text', expectedSecondaryConnectionId);
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
    clickCanvasAddCatalogAction('create-node', 'dvt:transform');
    cy.contains('.react-flow__node', 'Model 1', { timeout: 20_000 }).should('be.visible');

    connectCanvasNodes('Postgres', 'Model 1');
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
    cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');
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

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    getVisibleCanvasNodeByCardTitle('Model 1').find('[data-slot="canvas-node-shell"]').dblclick();
    cy.get('[data-slot="canvas-node-workbench-panel"]', { timeout: 10_000 }).should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-tab-code"]')
      .should('be.visible')
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-node-workbench-code-section"]').should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-code-section"]').should(
      'not.contain.text',
      'No SQL or generated code is recorded for this node.'
    );
    cy.get('[data-slot="dbt-model-code-provenance"]')
      .should('contain.text', 'models/model_1.sql')
      .and('contain.text', 'read-only projection');
    cy.get('[data-slot="canvas-node-workbench-code-section"]')
      .find('[data-testid="monaco-code-viewer"]')
      .should('be.visible')
      .find('.view-lines')
      .should(($lines) => {
        const sql = $lines.text();
        expect(sql).to.contain(`source('${expectedSourceName}', 'source_1')`);
        expect(sql).to.contain('origin."order_id" as "order_id"');
        expect(sql).to.contain('origin."customer" as "customer"');
        expect(sql).to.contain('origin."amount" as "amount"');
      });
    cy.get('[data-slot="canvas-node-workbench-code-section"]')
      .find('[data-testid="monaco-code-editor"]')
      .should('not.exist');
    readLiveGraphDraft(session).then((draftResponse) => {
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
      const model = nodes.find((node) => node.name === 'Model 1');
      expect(model?.metadata?.config).not.to.have.property('sql');
    });
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
      expect(content).to.contain(
        `from {{ source('${expectedSourceName}', 'source_1') }} as origin`
      );
      expect(content).to.contain('origin."order_id" as "order_id"');
      expect(content).to.contain('origin."customer" as "customer"');
      expect(content).to.contain('origin."amount" as "amount"');
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

    cy.get('[data-slot="canvas-contextual-workbench-close"]').should('be.visible').click();
    selectWorkspaceScope(secondarySession, {
      availableProjects: 'Projects available in this session',
      projectPrefix: 'Project',
    });

    cy.contains('Create canvas', { timeout: 20_000 }).should('be.visible');
    cy.get('.react-flow__node').should('not.exist');
    cy.get('[data-slot="canvas-playground-empty-state"]').within(() => {
      cy.contains('button', 'dbt').should('be.enabled').click();
    });
    cy.get('[data-slot="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-empty-state"]').should('not.exist');
    waitForLiveDraftSaved(secondarySession);

    openCanvasContextMenuAt(420, 280);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('open-source-import', 'dvt:source');
    importLivePostgresSource({ kind: 'graph-draft' }, scopeBConnectionSuffix);

    cy.get('[data-slot="graph-node-card-title"]', { timeout: 20_000 })
      .filter((_, element) => (element.textContent ?? '').includes('Postgres'))
      .should('have.length', 1);
    cy.contains('.react-flow__node', 'Model 1').should('not.exist');
    readLiveGraphDraft(secondarySession).then((draftResponse) => {
      expect(draftResponse.status).to.equal(200);
      const nodes = (
        draftResponse.body as {
          record: {
            draft: {
              nodes: Array<{
                name: string;
                pluginId: string;
                metadata?: Record<string, unknown>;
              }>;
            };
          };
        }
      ).record.draft.nodes;
      const importedSources = nodes.filter((node) => node.pluginId === 'dvt.warehouse-source');

      expect(importedSources).to.have.length(1);
      expect(importedSources[0]?.metadata?.connectedSourceRef).to.deep.equal({
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: expectedScopeBConnectionId,
          provider: 'postgres',
        },
        sourceObjectId: 'relation/dvt/public/source_1',
      });
      expect(nodes.some((node) => node.name === 'Model 1')).to.equal(false);
    });
    readLiveWorkspaceFile('models/sources/src_public.yml', secondarySession).then(
      (sourceYamlResponse) => {
        expect(sourceYamlResponse.status).to.equal(200);
        const content = (sourceYamlResponse.body as { content: string }).content;

        expect(content).to.contain(`name: ${expectedScopeBSourceName}`);
        expect(content).not.to.contain(`name: ${expectedSourceName}`);
      }
    );

    assertPresentedWorkspaceFileContent(expectedScopeBSourceName, expectedSourceName);

    cy.get('[data-slot="shell-menu-trigger"]').should('be.visible').focus().should('be.focused');
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.get('[data-slot="shell-language-menu"]')
      .should('be.visible')
      .and('contain.text', 'Language');
    cy.get('[data-slot="shell-language-option-es"]')
      .should('be.visible')
      .focus()
      .should('be.focused');
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.get('html').should('have.attr', 'lang', 'es');
    cy.get('[data-slot="shell-menu-trigger"]').should('contain.text', 'Vista');
    cy.window().should((window) => {
      expect(window.localStorage.getItem('dvt-web-application-language')).to.contain(
        '"language":"es"'
      );
    });
    cy.reload();
    cy.get('html').should('have.attr', 'lang', 'es');
    cy.get('[data-slot="shell-menu-trigger"]', { timeout: 20_000 })
      .should('be.visible')
      .and('contain.text', 'Vista');

    selectWorkspaceScope(session, {
      availableProjects: 'Proyectos disponibles en esta sesión',
      projectPrefix: 'Proyecto',
    });

    cy.get('[data-slot="graph-node-card-title"]', { timeout: 20_000 })
      .filter((_, element) => (element.textContent ?? '').includes('Postgres'))
      .should('have.length', 2);
    cy.contains('.react-flow__node', 'Model 1', { timeout: 20_000 }).should('be.visible');
    readLiveGraphDraft(session).then((draftResponse) => {
      expect(draftResponse.status).to.equal(200);
      const nodes = (
        draftResponse.body as {
          record: { draft: { nodes: Array<{ name: string; pluginId: string }> } };
        }
      ).record.draft.nodes;

      expect(nodes.filter((node) => node.pluginId === 'dvt.warehouse-source')).to.have.length(2);
      expect(nodes.some((node) => node.name === 'Model 1')).to.equal(true);
    });
    readLiveWorkspaceFile('models/sources/src_public.yml', session).then((sourceYamlResponse) => {
      expect(sourceYamlResponse.status).to.equal(200);
      const content = (sourceYamlResponse.body as { content: string }).content;

      expect(content).to.contain(`name: ${expectedSourceName}`);
      expect(content).not.to.contain(`name: ${expectedScopeBSourceName}`);
    });
    assertPresentedWorkspaceFileContent(expectedSourceName, expectedScopeBSourceName);
  });
});
