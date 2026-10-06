/** Owned concern: append a pending source without changing the published canonical draft before Apply. */
import { buildCanvasAuthoringDraft } from '../../support/canvasDrafts/buildCanvasAuthoringDraft';
import { verifyWheelZoom } from '../../support/relationalWorkbench/geometry';
import { joinWorkbenchProducers } from '../../support/relationalWorkbench/joinChain';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  dragWorkbenchSource,
  connectWorkbenchProducer,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench append', () => {
  beforeEach(() => {
    stubWorkbenchScenario('partial-join');
  });
  it('opens a partial canonical tree as the structural draft before appending', () => {
    const initialDraft = buildCanvasAuthoringDraft({
      substraitNInputJoin: true,
      title: 'Relational tree Workbench',
    });
    const initialTransform = initialDraft.nodes.find((node) => node.id === 'join-transform');
    const initialSemanticDocument = (
      initialTransform?.metadata?.transformAuthoring as
        | {
            semanticDocument?: {
              semanticPlan: { sha256: string };
              sidecar: { semanticPlanSha256: string };
            };
          }
        | undefined
    )?.semanticDocument;
    const initialSemanticPlanSha256 = initialSemanticDocument?.semanticPlan.sha256;
    const expectPublishedSemanticUnchanged = (): void => {
      semanticWrites('join-transform').forEach((call) => {
        const semanticDocument = semanticDocumentFromWrite(call) as {
          semanticPlan: { sha256: string };
          sidecar: { semanticPlanSha256: string };
        };
        expect(semanticDocument.semanticPlan.sha256).to.equal(initialSemanticPlanSha256);
        expect(semanticDocument.sidecar.semanticPlanSha256).to.equal(initialSemanticPlanSha256);
      });
    };
    cy.viewport(1400, 900);
    visitWorkbenchCanvas();

    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
    cy.get('[data-slot="canvas-relational-tree-start-authoring"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-tree-tab"]:visible').click();
    cy.get('[data-slot="canvas-relational-expression-tree"]:visible').should('have.length', 1);
    cy.get('[data-slot="canvas-operation-properties-tab"]:visible').click();
    cy.then(expectPublishedSemanticUnchanged);
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      1
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      2
    );
    verifyWheelZoom('[data-slot="canvas-relational-tree-draft-viewport"]');
    cy.then(expectPublishedSemanticUnchanged);

    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]')
      .closest('li')
      .as('existingJoin', { type: 'static' });
    cy.get('[data-slot="canvas-relational-output-edge-action"]').focus().type('{del}');
    dragWorkbenchSource('shipments');
    cy.contains('[data-slot="canvas-relational-tree-node"][data-operator="read"]', 'shipments')
      .closest('li')
      .as('shipments', { type: 'static' });
    joinWorkbenchProducers('@existingJoin', '@shipments', 'appendedJoin');
    connectWorkbenchProducer(
      '@appendedJoin',
      '[data-slot="canvas-relational-output-input-port"]',
      null
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      2
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      3
    );
    cy.then(expectPublishedSemanticUnchanged);

    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
    cy.wrap(null).should(expectPublishedSemanticUnchanged);
  });
});
