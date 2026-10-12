/**
 * Owned concern: prove a newly saved Canvas model stays editable and draggable after reopening.
 * @baseline GH-3578: blank-source creation is retired; creation and save are still required.
 * @decision Create a real model through the catalog and reuse the public Canvas drag gesture.
 * @consequence No duplicate drag engine, optional legacy path or seeded-created node hides failure.
 * @version 1.0.0
 */
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';

import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/copy';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  clickCanvasContextMenuItem,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { dragCanvasNodeByViewportDelta } from '../../support/canvasGraphAuthoring';
import { getE2eApiCalls, stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  revisitWorkbenchCanvas,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../../support/workspaceSession';

describe('Canvas happy path remains writable after create/save', () => {
  beforeEach(() => {
    stubShellBootstrapApis({
      scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubStatefulCanvasDraftAuthoring({ emptyCanvas: true, canvasKind: 'transformation' });
  });

  it('creates and saves a model, reopens without a projection gap, and allows drag', () => {
    const copy = resolveCanvasViewCopy('en');
    cy.viewport(1280, 720);
    visitWorkbenchCanvas('en');
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.get('.react-flow__node').should('not.exist');
    openCanvasContextMenuAt(320, 240);
    clickCanvasContextMenuItem('Add...');
    cy.get(
      '[data-slot="canvas-context-menu-add-catalog-item"][data-registration-kind="dvt:transform"]'
    )
      .should('be.visible')
      .click();
    cy.get('.react-flow__node')
      .should('have.length', 1)
      .invoke('attr', 'data-id')
      .then((nodeId) => {
        expect(nodeId, 'created model identity').to.be.a('string').and.not.be.empty;
        cy.wrap(null).should(() => {
          const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
            { draft: unknown } | undefined;
          expect(saved, 'real model save').not.to.be.undefined;
          const draft = WorkspaceGraphAuthoringDraftSchema.parse(saved!.draft);
          expect(draft.nodes).to.have.length(1);
          expect(draft.nodes[0]).to.include({ id: nodeId, name: 'Model 1', kind: 'transform' });
        });
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        revisitWorkbenchCanvas();
        cy.get('.react-flow__node').should('have.length', 1).and('have.attr', 'data-id', nodeId);
        cy.contains(copy.draftProjectionGapTitle).should('not.exist');
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        cy.screenshot('canvas-happy-path-before-drag');
        dragCanvasNodeByViewportDelta('Model 1', { x: 110, y: 80 }, { nodeId: nodeId! });
        cy.contains(copy.draftProjectionGapTitle).should('not.exist');
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        cy.screenshot('canvas-happy-path-after-drag');
      });
  });
});
