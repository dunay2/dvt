/**
 * Owned concern: prove the dbt authoring, generated Code, and Start Run path
 * against the live protected runtime without API stubs.
 */
import { canvasViewCopy } from '../../../src/app/views/canvas/copy';
import { resolveCodeViewCopy } from '../../../src/app/views/code/codeViewCopy';
import {
  clickButtonNatively,
  clickPreviewExecutionPlanFromOperationalDrawer,
} from '../../support/canvasExecutionSelection';
import { replaceLiveWorkspaceFile } from '../../support/dbtProjectLive';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  readLiveRunEvents,
  readLiveRunSnapshot,
  readLiveWorkspaceFile,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

const GENERATED_ORDER_ID_PROJECTION = 'origin."order_id" as "order_id"';
const GENERATED_AMOUNT_PROJECTION = 'origin."amount" as "amount"';
const EXTERNAL_MODEL_SQL = 'select externally_edited_amount from protected_project_code\n';

function openNodeWorkbench(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"]`, { timeout: 20_000 })
    .should('be.visible')
    .find('[data-slot="canvas-node-shell"]')
    .dblclick();
  cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
  cy.get('[data-slot="canvas-node-workbench-tab-general"]').should('be.visible').click();
}

function openNodeCodeWorkbench(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"]`, { timeout: 20_000 })
    .should('be.visible')
    .find('[data-slot="canvas-node-shell"]')
    .dblclick();
  cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
  cy.get('[data-slot="canvas-node-workbench-tab-code"]').should('be.visible').click();
  cy.get('[data-testid="monaco-code-viewer"]', { timeout: 30_000 }).should('be.visible');
  cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
}

function replaceInput(name: string, value: string): void {
  cy.get(`input[name="${name}"]`).should('be.enabled').clear().type(value);
}

function closeNodeWorkbench(): void {
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
}

function expectGeneratedModelSql(): void {
  cy.get('[data-testid="monaco-code-viewer"]')
    .find('.view-lines')
    .invoke('text')
    .should((renderedCode) => {
      const normalizedCode = renderedCode.replaceAll('\u00a0', ' ').replace(/\s+/g, ' ');
      expect(normalizedCode).to.match(/source\(\s*'finance_warehouse'\s*,\s*'payments_final'\s*\)/);
      expect(normalizedCode).to.contain(GENERATED_ORDER_ID_PROJECTION);
      expect(normalizedCode).to.contain(GENERATED_AMOUNT_PROJECTION);
    });
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

function openLiveGraphProjectCodeFile(path: string): void {
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
  cy.get('[data-testid="monaco-code-viewer"]', { timeout: 30_000 }).should('be.visible');
  cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
  cy.get('[data-slot="code-working-tree-status"]')
    .should('be.visible')
    .and('contain.text', resolveCodeViewCopy().workingTreeGraphOwnedReadOnlyLabel);
}

describe('Canvas dbt authoring Code and Run live protected runtime', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
      return;
    }

    seedLiveSelectedClosureDraft({
      dbtGraph: true,
      title: 'dbt authoring live',
    });
  });

  it('lets a user configure dbt-compatible models, inspect generated code, and execute', () => {
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
    clickButtonNatively(canvasViewCopy.inspectorApplyLabel);
    waitForPersistedWarehousePaymentsConfig();
    closeNodeWorkbench();

    openNodeWorkbench('orders_model');
    replaceInput('node-name', 'payments model');
    replaceInput('dbt-package', 'finance analytics');
    cy.get('select[name="dbt-materialized"]').should('be.enabled').select('table');
    cy.get('select[name="dbt-origin"]').should('be.enabled').select('warehouse_payments');
    closeNodeWorkbench();
    waitForPersistedDbtModelConfig();
    cy.get('.react-flow__node[data-id="orders_model"]').should('contain.text', 'Payments Model');

    openNodeCodeWorkbench('orders_model');
    expectGeneratedModelSql();
    closeNodeWorkbench();
    cy.get('.react-flow__node[data-id="orders_model"]').should('contain.text', 'Payments Model');

    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 }).should('be.visible');
    cy.contains(canvasViewCopy.planPreviewIdentityTitle).should('be.visible');
    cy.contains(canvasViewCopy.planPreviewPersistenceTitle).scrollIntoView().should('be.visible');
    cy.get('body').type('{esc}', { force: true });
    cy.get('[data-testid="plan-preview-modal"]').should('not.exist');

    readLiveWorkspaceFile('models/payments_model.sql').then((fileResponse) => {
      expect(fileResponse.status).to.equal(200);
      const content = String((fileResponse.body as { content?: unknown }).content ?? '');

      expect(content).to.contain("{{ config(materialized='table') }}");
      expect(content).to.contain("{{ source('finance_warehouse', 'payments_final') }}");
      expect(content).to.contain(GENERATED_ORDER_ID_PROJECTION);
      expect(content).to.contain(GENERATED_AMOUNT_PROJECTION);
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

    cy.get('[data-slot="run-detail-tabs"]', { timeout: 20_000 }).should('exist');

    const workingTreePath = 'models/payments_model.sql';

    visitWithLiveWorkspaceSession('/canvas');
    cy.contains('dbt authoring live', { timeout: 20_000 }).should('be.visible');
    cy.get('.react-flow__node[data-id="orders_model"]').should('contain.text', 'Payments Model');
    openNodeCodeWorkbench('orders_model');
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    expectGeneratedModelSql();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    openLiveGraphProjectCodeFile(workingTreePath);
    cy.get('[data-slot="canvas-contextual-workbench"]').within(() => {
      cy.get('button').should(($buttons) => {
        const labels = [...$buttons].map((button) => button.textContent?.trim());
        expect(labels).not.to.include.members(['Save', 'Guardar']);
      });
      cy.get('[data-testid="monaco-code-viewer"]')
        .find('.view-lines')
        .should(($lines) => {
          const renderedCode = $lines
            .text()
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ');
          expect(renderedCode).to.contain(GENERATED_ORDER_ID_PROJECTION);
          expect(renderedCode).to.contain(GENERATED_AMOUNT_PROJECTION);
        });
    });
    readLiveWorkspaceFile(workingTreePath).then((response) => {
      expect(response.status).to.equal(200);
      const content = String((response.body as { content?: unknown }).content ?? '');
      expect(content).to.contain(GENERATED_ORDER_ID_PROJECTION);
      expect(content).to.contain(GENERATED_AMOUNT_PROJECTION);
    });
    cy.get('[data-slot="canvas-contextual-workbench-close"]').should('be.visible').click();
    cy.get('[data-slot="canvas-contextual-workbench"]').should('not.exist');

    replaceLiveWorkspaceFile(workingTreePath, EXTERNAL_MODEL_SQL);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.contains(
      canvasViewCopy.planGraphModelSqlDivergenceMessageTemplate.replace('{path}', workingTreePath),
      { timeout: 30_000 }
    ).should('be.visible');
    cy.get('[data-testid="plan-preview-modal"]').should('not.exist');
    readLiveWorkspaceFile(workingTreePath).then((response) => {
      expect(response.status).to.equal(200);
      expect(String((response.body as { content?: unknown }).content ?? '')).to.equal(
        EXTERNAL_MODEL_SQL
      );
    });
  });
});
