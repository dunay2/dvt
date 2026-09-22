/** Owned concern: append a pending source without changing the published canonical draft before Apply. */
import { buildCanvasAuthoringDraft } from '../../support/canvasDraftAuthoring';
import { verifyWheelZoom } from '../../support/relationalWorkbench/geometry';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
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
    cy.get('[data-slot="canvas-relational-node-expand"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-tree-tab"]:visible').click();
    cy.get('[data-slot="canvas-relational-expression-tree"]:visible').should('have.length', 1);
    cy.get('[data-slot="canvas-operation-properties-tab"]:visible').click();
    cy.then(expectPublishedSemanticUnchanged);
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

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
    cy.get('[data-slot="canvas-relational-tree-existing-field"]')
      .should('contain.text', 'customers.customer_id')
      .find('option:selected')
      .should('have.text', 'customers.customer_id');
    cy.get('[data-slot="canvas-relational-tree-connected-field"]')
      .should('have.value', 'customer_id')
      .find('option:selected')
      .should('have.text', 'shipments.customer_id');
    cy.get('[data-slot="canvas-relational-tree-append-input"]').should('be.enabled').click();
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
