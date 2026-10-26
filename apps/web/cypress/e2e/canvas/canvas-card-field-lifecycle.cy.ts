/**
 * Owned concern: preserve field lifecycle evidence for binary and composed Model outputs.
 * @baseline GH-3578: current controls retain selection, focus, order and disconnection coverage.
 * @decision Reuse one inspector journey for two and three canonical source operands.
 * @consequence Reload must preserve outputs without rewriting operands or predicates.
 * @version 1.0.0
 */
import { installE2eApiFetchStub } from '../../support/e2eApiStub';
import { proveCardOutputControls } from '../../support/relationalWorkbench/cardOutputControls';
import { proveEmptyJoinOutput } from '../../support/relationalWorkbench/emptyOutputs';
import { prepareFieldSelection } from '../../support/relationalWorkbench/fieldSelection';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';
import { savedOutputs } from '../../support/relationalWorkbench/savedOutputs';

describe('Canvas field lifecycle', () => {
  for (const sourceCount of [2, 3] as const) {
    it(`selects a Source occurrence contribution to Output with ${sourceCount} inputs and reload`, () => {
      prepareFieldSelection(sourceCount);
      openWorkbenchModel('join-transform');
      const source = '[data-slot="canvas-relational-tree-node"][data-operator="read"]';
      const rows = '[data-slot="source-occurrence-outputs"]';
      const toggle = `${rows} [data-field-name="name"]`;
      let excluded: ReturnType<typeof savedOutputs>;
      cy.get(source).first().click();
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should('contain.text', 'name');
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-relational-edit"]').should('have.text', 'Edit').click();
      cy.get(toggle).should('have.attr', 'data-included', 'true').focus().click();
      cy.get(toggle).should('have.attr', 'data-included', 'false').and('be.focused');
      cy.get(`${rows} [role="checkbox"]`).should('not.exist');
      cy.get(toggle).should('have.attr', 'data-included', 'false');
      cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should('contain.text', 'name');
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-relational-edit"]').should('have.text', 'Edit').click();
      cy.get(toggle).should('have.attr', 'data-included', 'true').click();
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should(
        'not.contain.text',
        'name'
      );
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        excluded = savedOutputs();
        expect(excluded.operands).to.have.length(sourceCount);
        expect(excluded.outputs.some((field) => field.displayName === 'name')).to.equal(false);
      });
      cy.on('window:before:load', installE2eApiFetchStub);
      cy.reload();
      openWorkbenchModel('join-transform');
      cy.get(source).first().click();
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-relational-edit"]').should('have.text', 'Edit').click();
      cy.get(toggle).should('have.attr', 'data-included', 'false').click();
      cy.get(toggle).should('have.attr', 'data-included', 'true');
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should('contain.text', 'name');
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        const restored = savedOutputs();
        expect(restored.outputs).to.have.length(excluded.outputs.length + 1);
        expect(restored.operands).to.deep.equal(excluded.operands);
        expect(restored.predicates).to.deep.equal(excluded.predicates);
      });
      cy.get('[data-slot="canvas-relational-tree-output-open"]').click();
      cy.get(
        '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-operation-output-tab"]'
      ).click();
      cy.get('[data-slot="canvas-model-output-inspector"] [data-slot="canvas-relational-edit"]')
        .should('have.text', 'Edit')
        .click();
      cy.get('[data-slot="relation-output-toggle"][data-field-name="name"]').should(
        'have.attr',
        'data-included',
        'true'
      );
      cy.screenshot(`source-occurrence-output-${sourceCount}-inputs`);
    });
    it(`preserves focus, output selection, ordering and reload with ${sourceCount} inputs`, () => {
      prepareFieldSelection(sourceCount);
      proveCardOutputControls(sourceCount);
    });
    it(`clears all outputs with ${sourceCount} inputs, disconnected sources and reload`, () => {
      prepareFieldSelection(sourceCount);
      proveEmptyJoinOutput(sourceCount);
    });
  }
});
