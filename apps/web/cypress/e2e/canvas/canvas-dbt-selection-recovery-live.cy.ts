/**
 * Owned concern: prove unavailable DBT execution selection recovery through
 * the live protected Canvas workflow without draft endpoint interception.
 */
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuItem,
  openCanvasContextMenuAt,
  revealOperationalDrawer,
} from '../../support/canvasExecutionSelection';
import {
  assertLiveFirstAuthoringDraftScopeIsClean,
  resolveLiveFirstAuthoringWorkspaceSession,
  skipWhenFirstAuthoringLiveEnvIsMissing,
} from '../../support/canvasFirstAuthoring';
import { readLiveGraphDraft } from '../../support/liveProtectedRuntime';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

function resolveSelectionRecoverySession(): ReturnType<
  typeof resolveLiveFirstAuthoringWorkspaceSession
> {
  return resolveLiveFirstAuthoringWorkspaceSession('dbt');
}

function visitCleanDbtCanvas(): void {
  const session = resolveSelectionRecoverySession();

  cy.visit('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.clear();
      seedE2eWorkspaceSession(window, session);
    },
  });
}

function addDbtModelAt(x: number, y: number): void {
  openCanvasContextMenuAt(x, y);
  clickCanvasContextMenuItem(/^(Add|Anadir)\.\.\.$/);
  clickCanvasAddCatalogAction('create-node', 'dvt:transform');
}

function readPersistedNodeIds(response: Cypress.Response<unknown>): readonly string[] | null {
  const nodeIds = (response.body as { record?: { draft?: { nodeIds?: unknown } } }).record?.draft
    ?.nodeIds;

  return Array.isArray(nodeIds) && nodeIds.every((nodeId) => typeof nodeId === 'string')
    ? nodeIds
    : null;
}

function waitForPersistedDraftRecord(attempt = 0): Cypress.Chainable<void> {
  return readLiveGraphDraft(resolveSelectionRecoverySession()).then((response) => {
    if (response.status === 200) return;
    if (attempt >= 80) {
      throw new Error(`Timed out waiting for persisted DBT draft; last status ${response.status}.`);
    }

    return cy.wait(250).then(() => waitForPersistedDraftRecord(attempt + 1));
  });
}

function waitForPersistedNodePresence(nodeId: string, attempt = 0): Cypress.Chainable<void> {
  return readLiveGraphDraft(resolveSelectionRecoverySession()).then((response) => {
    expect(response.status).to.equal(200);
    const nodeIds = readPersistedNodeIds(response);

    if (nodeIds?.includes(nodeId)) return;
    if (attempt >= 80) {
      throw new Error(`Timed out waiting for persisted node ${nodeId}.`);
    }

    return cy.wait(250).then(() => waitForPersistedNodePresence(nodeId, attempt + 1));
  });
}

function waitForPersistedNodeAbsence(nodeId: string, attempt = 0): Cypress.Chainable<void> {
  return readLiveGraphDraft(resolveSelectionRecoverySession()).then((response) => {
    expect(response.status).to.equal(200);
    const nodeIds = readPersistedNodeIds(response);

    if (nodeIds != null && !nodeIds.includes(nodeId)) return;
    if (attempt >= 80) {
      throw new Error(`Timed out waiting for persisted deletion of ${nodeId}.`);
    }

    return cy.wait(250).then(() => waitForPersistedNodeAbsence(nodeId, attempt + 1));
  });
}

describe('Canvas DBT execution-selection recovery live protected runtime', () => {
  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) return;
  });

  it('recovers a deleted selected root without silently widening execution scope', () => {
    assertLiveFirstAuthoringDraftScopeIsClean('dbt');
    visitCleanDbtCanvas();

    cy.contains('Create canvas', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-playground-empty-state"]')
      .contains('button', 'dbt')
      .should('be.enabled')
      .click();
    waitForPersistedDraftRecord();

    addDbtModelAt(360, 260);
    waitForPersistedNodePresence('dbt-model-1');
    addDbtModelAt(700, 360);
    waitForPersistedNodePresence('dbt-model-2');

    cy.get('.react-flow__node[data-id="dbt-model-2"]')
      .should('be.visible')
      .within(() => {
        cy.get('button[aria-label="Deselect for execution"]').should('be.enabled').click();
        cy.get('button[aria-label="Select for execution"]').should('be.visible');
      });

    cy.get('.react-flow__node[data-id="dbt-model-1"]', { timeout: 20_000 })
      .should('be.visible')
      .within(() => {
        cy.get('button[aria-label="Select for execution"]').should('be.enabled').click();
        cy.get('button[aria-label="Deselect for execution"]').should('be.visible');
      });

    cy.get('.react-flow__node[data-id="dbt-model-1"]')
      .find('[data-slot="graph-node-card-actions"]')
      .should('be.visible')
      .click();
    cy.contains('[data-slot="canvas-node-context-menu-item"]', /^(Delete|Eliminar)$/)
      .should('be.visible')
      .click();
    cy.get('.react-flow__node[data-id="dbt-model-1"]').should('not.exist');
    waitForPersistedNodeAbsence('dbt-model-1');

    revealOperationalDrawer();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]').click();
    cy.get('[data-slot="bottom-operational-selection-status"]')
      .invoke('text')
      .should('match', /blocked|bloqueada/i);
    cy.contains(/^(Unavailable roots|Raíces no disponibles)$/)
      .parent()
      .should('contain.text', 'dbt-model-1');
    cy.contains(/^(Admitted scope|Alcance admitido)$/)
      .parent()
      .invoke('text')
      .should('match', /None|Ninguno/i);
    cy.contains('button', /^(Use workspace scope|Usar alcance del workspace)$/)
      .should('be.enabled')
      .click();

    cy.get('[data-slot="bottom-operational-selection-status"]')
      .invoke('text')
      .should('match', /ready|lista/i);
    cy.get('[data-slot="bottom-operational-selection-recovery-receipt"]')
      .should('contain.text', 'dbt-model-1')
      .and('contain.text', 'workspace');
    cy.contains(/^(Admitted scope|Alcance admitido)$/)
      .parent()
      .should('contain.text', 'dbt-model-2');
    cy.get('[data-slot="bottom-operational-preview-action"]').should('be.enabled');
    cy.screenshot('canvas-dbt-selection-recovery-live-ready');
  });
});
