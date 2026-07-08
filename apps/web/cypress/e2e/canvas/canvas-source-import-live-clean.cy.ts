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
import { readLiveGraphDraft, readLiveWorkspaceFile } from '../../support/liveProtectedRuntime';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

function visitCleanDbtCanvas(): void {
  const session = resolveLiveFirstAuthoringWorkspaceSession('dbt');

  cy.visit('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.clear();
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

type DragPoint = Readonly<{ x: number; y: number }>;

function toStableYamlIdentifierPart(part: string): string {
  const normalized = part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'unnamed';
}

function expectedLivePostgresSourceName(): string {
  const runId = String(Cypress.env('firstAuthoringRunId') ?? 'source-import-live');
  return [`live-postgres-${runId}`, 'dvt', 'public'].map(toStableYamlIdentifierPart).join('_');
}

function buildMouseDragEvent(
  point: DragPoint,
  buttons: number,
  view: Cypress.AUTWindow
): MouseEventInit {
  return {
    bubbles: true,
    button: 0,
    buttons,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    screenX: point.x,
    screenY: point.y,
    view,
  };
}

function dispatchMouseDragEvent(
  target: EventTarget,
  view: Cypress.AUTWindow,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  point: DragPoint,
  buttons: number
): void {
  target.dispatchEvent(new view.MouseEvent(type, buildMouseDragEvent(point, buttons, view)));
}

function readHandleCenter(handle: HTMLElement): DragPoint {
  const rect = handle.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getVisibleCanvasNodeByCardTitle(nodeName: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .get('[data-slot="graph-node-card-title"]', { timeout: 20_000 })
    .filter((_, element) => {
      const text = element.textContent ?? '';
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return (
        text.includes(nodeName) &&
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    })
    .should('have.length.greaterThan', 0)
    .first()
    .closest('.react-flow__node')
    .should('be.visible');
}

function findNodePort(
  nodeName: string,
  port: 'source' | 'target'
): Cypress.Chainable<JQuery<HTMLElement>> {
  return getVisibleCanvasNodeByCardTitle(nodeName)
    .find(`[data-slot="canvas-node-port-handle"][data-port="${port}"]`)
    .should('be.visible');
}

function connectCanvasNodes(sourceName: string, targetName: string): void {
  findNodePort(sourceName, 'source').then(($sourceHandle) => {
    findNodePort(targetName, 'target').then(($targetHandle) => {
      const sourcePoint = readHandleCenter($sourceHandle[0]!);
      const targetPoint = readHandleCenter($targetHandle[0]!);
      const middlePoint = {
        x: (sourcePoint.x + targetPoint.x) / 2,
        y: (sourcePoint.y + targetPoint.y) / 2,
      };

      cy.window().then((window) => {
        dispatchMouseDragEvent($sourceHandle[0]!, window, 'mousedown', sourcePoint, 1);
        dispatchMouseDragEvent(window.document, window, 'mousemove', middlePoint, 1);
        dispatchMouseDragEvent(window.document, window, 'mousemove', targetPoint, 1);
        dispatchMouseDragEvent(window.document, window, 'mouseup', targetPoint, 0);
      });
    });
  });
}

function createLivePostgresConnection(): string {
  const runId = String(Cypress.env('firstAuthoringRunId') ?? 'source-import-live');
  const connectionName = `Live Postgres ${runId}`;

  cy.contains('[role="dialog"] button', 'New connection').should('be.enabled').click();
  cy.get('[data-slot="source-import-create-connection-name"]')
    .should('be.visible')
    .clear()
    .type(connectionName);
  cy.get('[data-slot="source-import-create-connection-type"]').select('postgres');
  cy.get('[data-slot="source-import-create-connection-database"]').clear().type('dvt');
  cy.get('[data-slot="source-import-create-connection-credential-ref"]')
    .clear()
    .type('env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL');
  cy.contains('[role="dialog"] button', 'Create connection').should('be.enabled').click();
  cy.contains('[data-slot="source-import-connection-option"]', connectionName, {
    timeout: 30_000,
  })
    .should('be.visible')
    .and('have.attr', 'aria-pressed', 'true');

  return connectionName;
}

function importLocalPostgresSource(): void {
  cy.contains('[role="dialog"]', 'Add source', { timeout: 20_000 }).should('be.visible');
  createLivePostgresConnection();
  cy.contains('[role="dialog"] button', 'Test connection').should('be.enabled').click();
  cy.contains('[role="dialog"]', 'Connection passed', { timeout: 20_000 }).should('be.visible');
  cy.contains('[role="dialog"]', 'tables reachable').should('be.visible');

  cy.contains('[role="tab"]', 'Browse').click();
  cy.get('[data-slot="source-import-table-search"]', { timeout: 20_000 })
    .should('be.visible')
    .clear()
    .type('source_1');
  cy.contains('[role="dialog"]', 'Source metadata').should('be.visible');
  cy.contains('[role="dialog"]', 'dvt', { timeout: 20_000 }).should('be.visible');
  cy.contains('[role="dialog"]', 'public').should('be.visible');
  cy.get('[data-source-import-table="dvt.public.source_1"]', { timeout: 20_000 })
    .should('be.visible')
    .within(() => {
      cy.contains('order_id').should('be.visible');
      cy.contains('3 rows').should('be.visible');
      cy.contains('32 KB').should('be.visible');
    })
    .click();
  cy.get('[data-source-import-table-select="dvt.public.source_1"]', { timeout: 20_000 }).click();
  cy.contains('[role="dialog"]', 'Selected: 1').should('be.visible');
  cy.contains('[role="dialog"]', 'Selected sources').should('be.visible');
  cy.contains('[role="dialog"]', 'dvt.public.source_1').should('be.visible');

  cy.contains('[role="tab"]', 'Metadata').click();
  cy.contains('[role="dialog"]', 'order_id', { timeout: 20_000 }).should('be.visible');
  cy.contains('[role="dialog"]', '3 rows').should('be.visible');
  cy.contains('[role="dialog"]', '32 KB').should('be.visible');
  cy.contains('[role="dialog"]', 'customer').should('be.visible');
  cy.contains('[role="dialog"]', 'amount').should('be.visible');

  cy.contains('[role="tab"]', 'Selected').click();
  cy.contains('[role="dialog"]', 'Selected sources').should('be.visible');
  cy.contains('button', 'Attach sources to canvas').should('be.enabled').click();

  cy.contains('[role="dialog"]', 'Sources attached', { timeout: 30_000 }).should('be.visible');
  cy.contains('[role="dialog"]', '[file] models/sources/src_public.yml').should('be.visible');
  cy.contains('[role="dialog"] button', 'Done').click();
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
    importLocalPostgresSource();

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

    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.contains('Execution Preview', { timeout: 30_000 }).should('be.visible');
    cy.contains('Execution Preview identity').should('be.visible');
    cy.contains('Persistence evidence').scrollIntoView().should('be.visible');

    readLiveWorkspaceFile('models/model_1.sql', session).then((modelSqlResponse) => {
      expect(modelSqlResponse.status).to.equal(200);
      const content = (modelSqlResponse.body as { content: string }).content;

      expect(content).to.contain("{{ config(materialized='view') }}");
      expect(content).to.contain(`{{ source('${expectedSourceName}', 'source_1') }}`);
    });
  });
});
