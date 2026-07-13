/**
 * Owned concern: prove the dbt authoring, generated Code, and Start Run path
 * against the live protected runtime without API stubs.
 */
import {
  clickButtonNatively,
  clickPreviewExecutionPlanFromOperationalDrawer,
} from '../../support/canvasExecutionSelection';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  readLiveRunEvents,
  readLiveRunSnapshot,
  readLiveWorkspaceFile,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

function openNodeWorkbench(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"]`, { timeout: 20_000 })
    .should('be.visible')
    .dblclick();
  cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
}

function replaceInput(name: string, value: string): void {
  cy.get(`input[name="${name}"]`).should('be.enabled').clear().type(value);
}

function clickCommandSlotNatively(slot: string): void {
  cy.get(`[data-slot="${slot}"]`)
    .should('be.enabled')
    .then(($button) => {
      ($button.get(0) as HTMLButtonElement).click();
    });
}

function waitForPersistedWarehousePaymentsConfig(attempt = 0): Cypress.Chainable<void> {
  return readLiveGraphDraft().then((response) => {
    expect(response.status).to.equal(200);
    const nodes = (
      response.body as {
        record?: {
          draft?: {
            nodes?: Array<{ id: string; metadata?: Record<string, unknown> }>;
          };
        };
      }
    ).record?.draft?.nodes;
    const source = nodes?.find((node) => node.id === 'warehouse_payments');
    const metadata = source?.metadata?.dbt as
      | { packageName?: string; sourceName?: string; schemaName?: string; tableName?: string }
      | undefined;

    if (
      metadata?.packageName === 'finance analytics' &&
      metadata.sourceName === 'finance_warehouse' &&
      metadata.schemaName === 'warehouse raw' &&
      metadata.tableName === 'payments_final'
    ) {
      return;
    }

    if (attempt >= 30) {
      throw new Error('Timed out waiting for persisted warehouse payments source configuration.');
    }

    return cy.wait(250).then(() => waitForPersistedWarehousePaymentsConfig(attempt + 1));
  });
}

function waitForPersistedDbtModelConfig(attempt = 0): Cypress.Chainable<void> {
  return readLiveGraphDraft().then((response) => {
    expect(response.status).to.equal(200);
    const nodes = (
      response.body as {
        record?: {
          draft?: {
            nodes?: Array<{ id: string; name: string; metadata?: Record<string, unknown> }>;
          };
        };
      }
    ).record?.draft?.nodes;
    const model = nodes?.find((node) => node.id === 'orders_model');
    const metadata = model?.metadata?.dbt as
      { materialized?: string; selectedSourceId?: string; packageName?: string } | undefined;

    if (
      model?.name === 'payments model' &&
      metadata?.materialized === 'table' &&
      metadata.selectedSourceId === 'warehouse_payments' &&
      metadata.packageName === 'finance analytics'
    ) {
      return;
    }

    if (attempt >= 30) {
      throw new Error('Timed out waiting for persisted dbt model card configuration.');
    }

    return cy.wait(250).then(() => waitForPersistedDbtModelConfig(attempt + 1));
  });
}

function openLiveProjectCodeFile(path: string): void {
  cy.get('[data-slot="shell-workspace-menu-trigger"]', { timeout: 20_000 }).click();
  cy.get('[data-slot="canvas-workspace-open-project-code-command"]')
    .should('be.visible')
    .and(($item) => {
      expect($item.attr('data-disabled')).to.be.undefined;
    })
    .click();
  cy.get('[data-slot="canvas-contextual-workbench"]', { timeout: 30_000 }).should('be.visible');
  cy.get(`[data-slot="code-workspace-file-entry"][data-workspace-path="${path}"]`, {
    timeout: 30_000,
  })
    .should('be.visible')
    .click();
  cy.get('[data-testid="monaco-code-editor"]', { timeout: 30_000 }).should('be.visible');
}

function waitForLiveWorkspaceFileContent(
  path: string,
  expectedContent: string,
  attempt = 0
): Cypress.Chainable<void> {
  return readLiveWorkspaceFile(path).then((response) => {
    expect(response.status).to.equal(200);
    const content = String((response.body as { content?: unknown }).content ?? '');

    if (content === expectedContent) {
      return;
    }

    if (attempt >= 30) {
      throw new Error(`Timed out waiting for live workspace content at ${path}.`);
    }

    return cy
      .wait(250)
      .then(() => waitForLiveWorkspaceFileContent(path, expectedContent, attempt + 1));
  });
}

describe('Canvas dbt authoring Code and Run live protected runtime', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
      return;
    }

    seedLiveSelectedClosureDraft({
      canvasKind: 'dbt',
      title: 'dbt authoring live',
    });
  });

  it('lets a user configure dbt cards, select origin, inspect generated code, and execute', () => {
    cy.viewport(1500, 900);
    visitWithLiveWorkspaceSession('/canvas');

    cy.contains('dbt authoring live', { timeout: 20_000 }).should('be.visible');
    cy.get('.react-flow__node[data-id="raw_orders"]')
      .should('be.visible')
      .and('contain.text', 'Raw Orders');
    cy.get('.react-flow__node[data-id="warehouse_payments"]')
      .should('be.visible')
      .and('contain.text', 'Warehouse Payments');
    cy.get('.react-flow__node[data-id="orders_model"]')
      .should('be.visible')
      .and('contain.text', 'Orders Model');

    openNodeWorkbench('warehouse_payments');
    replaceInput('dbt-package', 'finance analytics');
    replaceInput('dbt-source', 'finance warehouse');
    replaceInput('dbt-schema', 'warehouse raw');
    replaceInput('dbt-table', 'payments final');
    clickButtonNatively('Apply');
    waitForPersistedWarehousePaymentsConfig();

    openNodeWorkbench('orders_model');
    replaceInput('node-name', 'payments model');
    replaceInput('dbt-package', 'finance analytics');
    cy.get('select[name="dbt-materialized"]').should('be.enabled').select('table');
    cy.get('select[name="dbt-origin"]').should('be.enabled').select('warehouse_payments');
    clickButtonNatively('Apply');
    waitForPersistedDbtModelConfig();

    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.contains('Execution Preview', { timeout: 30_000 }).should('be.visible');
    cy.contains('Execution Preview identity').should('be.visible');
    cy.contains('Persistence evidence').scrollIntoView().should('be.visible');
    cy.get('body').type('{esc}', { force: true });
    cy.contains('Execution Preview').should('not.exist');

    readLiveWorkspaceFile('models/payments_model.sql').then((fileResponse) => {
      expect(fileResponse.status).to.equal(200);
      const content = String((fileResponse.body as { content?: unknown }).content ?? '');

      expect(content).to.contain("{{ config(materialized='table') }}");
      expect(content).to.contain("{{ source('finance_warehouse', 'payments_final') }}");
    });

    clickCommandSlotNatively('shell-run-command');

    cy.location('pathname', { timeout: 20_000 }).should('match', /^\/runs\/[^/]+$/);
    cy.location('pathname').then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.to.equal('');

      readLiveRunSnapshot(runId!).then((snapshotResponse) => {
        expect(snapshotResponse.status).to.equal(200);
        expect((snapshotResponse.body as { runId: string }).runId).to.equal(runId);
      });

      readLiveRunEvents(runId!).then((eventsResponse) => {
        expect(eventsResponse.status).to.equal(200);
      });
    });

    cy.contains(/^Run /, { timeout: 20_000 }).should('exist');

    const workingTreePath = 'models/payments_model.sql';
    const workingTreeContent = 'select 7 as live_working_tree_verified';

    visitWithLiveWorkspaceSession('/canvas');
    cy.contains('dbt authoring live', { timeout: 20_000 }).should('be.visible');
    openLiveProjectCodeFile(workingTreePath);
    cy.get('[data-slot="canvas-contextual-workbench"]').within(() => {
      cy.contains('button', 'Save').should('not.exist');
      cy.get('[data-testid="monaco-code-editor"]')
        .find('.monaco-editor textarea')
        .first()
        .focus()
        .type(`{ctrl+a}${workingTreeContent}`, { force: true, delay: 0 });
      cy.get('[data-slot="code-working-tree-status"]').should(($status) => {
        expect($status.text()).to.match(/Synchronized|Sincronizado/);
      });
    });
    waitForLiveWorkspaceFileContent(workingTreePath, workingTreeContent);

    cy.reload();
    cy.contains('dbt authoring live', { timeout: 20_000 }).should('be.visible');
    openLiveProjectCodeFile(workingTreePath);
    cy.get('[data-slot="canvas-contextual-workbench"]').within(() => {
      cy.contains('button', 'Save').should('not.exist');
      cy.get('[data-testid="monaco-code-editor"]')
        .find('.view-lines')
        .should('contain.text', 'live_working_tree_verified');
    });
    waitForLiveWorkspaceFileContent(workingTreePath, workingTreeContent);
  });
});
