/** Owned concern: contextual removal, cancel without writes and canonical save/reopen. */
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  revisitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
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

describe('Workbench removal', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
  });
  it('removes cards through their context menu, cancels without writes and persists canonical Substrait on Apply', () => {
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-node-title"]')
      .first()
      .should('have.css', 'font-size', '14px');
    cy.get('[data-slot="canvas-relational-tree-node"]')
      .first()
      .should('have.css', 'font-family')
      .and('contain', 'Segoe UI');
    cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('be.visible');
    cy.get('[role="combobox"]').type('UNION ALL');
    cy.get('[data-slot="dvt-select-operation-union-all"]').should('be.visible');
    cy.get('[role="combobox"]').type('{esc}');
    cy.get('[role="listbox"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[role="combobox"]').type('{esc}');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').rightclick();
    cy.get('[data-slot="canvas-relational-remove-left"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-remove-left"]')
      .should('have.css', 'font-family')
      .and('contain', 'Segoe UI');
    cy.get('[data-slot="canvas-relational-remove-left"]').should('have.css', 'font-size', '14px');
    cy.screenshot('semantic-editor-card-context-menu');
    cy.get('[data-slot="canvas-relational-remove-left"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="project"]').should(
      'not.exist'
    );
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      2
    );
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    cy.contains(
      '[data-slot="canvas-relational-tree-node"][data-operator="read"]',
      'orders'
    ).rightclick();
    cy.get('[data-slot="canvas-relational-remove-source"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(1)
    );
    cy.then(() => {
      const document = semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!);
      const draft = decodeDvtSubstraitSemanticDocument(document);
      const { index } = deriveSubstraitSchemas(draft);
      const reads = [...index.relations.values()].filter(
        (entry) => entry.relation.relType.case === 'read'
      );
      expect(reads).to.have.length(1);
      expect(index.relations.size).to.equal(1);
      expect(draft.sidecar.fields.length).to.be.greaterThan(0);
      expect(reads[0]!.binding.sourceRef?.sourceObjectId).to.equal('relation/dvt/public/customers');
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    revisitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="project"]').should(
      'not.exist'
    );
  });

  it('removes an operand with the keyboard, cancels, applies and returns to its opener', () => {
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    const opener = '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]';
    const source = '[data-slot="canvas-relational-tree-node"][data-operator="read"]';
    cy.get(opener).should('be.visible').focus().type('{enter}');
    cy.get('[data-slot="canvas-model-editor"]').should('be.focused');
    cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    for (const action of ['cancel', 'apply'] as const) {
      tabTo(source);
      cy.focused()
        .should('be.visible')
        .and(($control) => {
          expect($control.css('outline-style')).not.to.equal('none');
          expect(parseFloat($control.css('outline-width'))).to.be.greaterThan(0);
        });
      cy.press(Cypress.Keyboard.Keys.SPACE);
      cy.press(Cypress.Keyboard.Keys.DELETE);
      cy.get(source).should('have.length', 1);
      cy.focused().should('not.have.prop', 'tagName', 'BODY');
      tabTo(`[data-slot="canvas-relational-tree-${action}"]`);
      cy.press(Cypress.Keyboard.Keys.SPACE);
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
      cy.focused().should('not.have.prop', 'tagName', 'BODY');
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
