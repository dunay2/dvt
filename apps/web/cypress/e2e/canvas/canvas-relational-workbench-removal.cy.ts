/** Owned concern: inline consent, discardable card deletion and retained configuration after save/reopen. */
import {
  DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY,
  DvtRelationalAuthoringDraftV1Schema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  revisitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

/** Traverse real tab stops, without placing focus on the requested control. */
function tabTo(selector: string, remaining = 60): void {
  cy.document().then((document) => {
    if (document.activeElement?.matches(selector)) return;
    expect(remaining, `Reachable keyboard control: ${selector}`).to.be.greaterThan(0);
    cy.press(Cypress.Keyboard.Keys.TAB);
    tabTo(selector, remaining - 1);
  });
}

const source = '[data-slot="canvas-relational-tree-node"][data-operator="read"]';
const join = '[data-slot="canvas-relational-tree-node"][data-operator="join"]';
const confirm = '[data-slot="canvas-card-removal-confirm"]';
const cancel = '[data-slot="canvas-card-removal-cancel"]';

describe('Workbench removal', () => {
  beforeEach(() => stubWorkbenchScenario('saved-join'));

  it('confirms inline, keeps dependent cards and their configuration after Apply and reopen', () => {
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
    cy.get(join).rightclick();
    cy.get(
      '[data-slot="canvas-relational-remove-left"], [data-slot="canvas-relational-remove-right"]'
    ).should('not.exist');
    cy.get('[data-slot="canvas-relational-remove-source"]').click();
    cy.get('[data-slot="canvas-card-removal-bar"]').should('be.visible');
    cy.get('[role="dialog"], [role="alertdialog"]').should('not.exist');
    cy.get(join).should('have.length', 1);
    cy.get(source).should('have.length', 2);
    cy.get('[data-removal-impact="true"]').should('have.length.at.least', 1);
    cy.get(cancel).click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));

    cy.contains(source, 'orders').rightclick();
    cy.get('[data-slot="canvas-relational-remove-source"]').click();
    cy.get('[data-slot="canvas-card-removal-bar"]').should('contain.text', 'INNER JOIN');
    cy.screenshot('card-removal-inline-confirmation');
    cy.get(confirm).click();
    cy.get(join).should('contain.text', 'Missing input');
    cy.get(source).should('have.length', 1);
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(1)
    );
    cy.then(() => {
      const call = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)!;
      const model = (call.body as { draft: WorkspaceGraphAuthoringDraft }).draft.nodes.find(
        (node) => node.id === 'join-transform'
      )!;
      expect(model.metadata?.transformAuthoring).to.equal(undefined);
      const draft = DvtRelationalAuthoringDraftV1Schema.parse(
        model.metadata?.[DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY]
      );
      expect(draft.sources).to.have.length(1);
      const retained = draft.operations.find((operation) => operation.operation === 'inner_join')!;
      expect(retained.inputs).to.include(null);
      expect(retained.configurationDocument).not.to.equal(undefined);
      expect(retained.semanticDocument).to.equal(undefined);
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    revisitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get(source).should('have.length', 1);
    cy.get(join).should('contain.text', 'Missing input');
    cy.get('[data-slot="canvas-relational-tree-output"]').should('exist');
  });

  it('removes an operand with the keyboard, cancels, applies and returns to its opener', () => {
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    const opener = '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]';
    cy.get(opener).should('be.visible').focus().type('{enter}');
    cy.get('[data-slot="canvas-model-editor"]').should('be.focused');
    for (const action of ['cancel', 'apply'] as const) {
      tabTo(source);
      cy.focused()
        .should('be.visible')
        .and(($control) => {
          expect($control.css('outline-style')).not.to.equal('none');
          expect(parseFloat($control.css('outline-width'))).to.be.greaterThan(0);
        });
      cy.press(Cypress.Keyboard.Keys.DELETE);
      cy.get(cancel).should('be.focused');
      cy.press(Cypress.Keyboard.Keys.ESC);
      cy.get(source).should('have.length', 2);
      cy.focused().should('match', source);
      cy.press(Cypress.Keyboard.Keys.DELETE);
      tabTo(confirm);
      cy.press(Cypress.Keyboard.Keys.SPACE);
      cy.get(source).should('have.length', 1);
      cy.focused().should('not.have.prop', 'tagName', 'BODY');
      tabTo(`[data-slot="canvas-relational-tree-${action}"]`);
      cy.press(Cypress.Keyboard.Keys.SPACE);
      cy.get('[data-slot="canvas-relational-tree-apply"]').should(
        action === 'apply' ? 'be.disabled' : 'not.exist'
      );
      cy.wrap(null).should(() =>
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(
          action === 'apply' ? 1 : 0
        )
      );
      cy.get(source).should('have.length', action === 'cancel' ? 2 : 1);
    }
    tabTo('[data-slot="canvas-model-tab-close"]');
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.get(opener).should('be.focused');
    revisitWorkbenchCanvas();
    cy.get(opener).should('be.visible').focus().type('{enter}');
    cy.get(source).should('have.length', 1);
    cy.then(() => {
      expect(getE2eApiCalls(/sample|preview/)).to.have.length(0);
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(1);
    });
  });
});
