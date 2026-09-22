/** Owned concern: selected-JOIN predicate editing retains nested operands and canonical source identity. */
import {
  decodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import {
  verifyWheelZoom,
  revealSemanticZoom,
  verifyCompleteTreeFit,
} from '../../support/relationalWorkbench/geometry';
import { authorFourSourceChain } from '../../support/relationalWorkbench/joinChain';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench predicates', () => {
  beforeEach(() => {
    stubWorkbenchScenario('pending-chain');
  });
  it('keeps unsaved predicates per JOIN and persists nested functions against the original source', () => {
    authorFourSourceChain();
    const cards = '[data-slot="canvas-relational-tree-draft"] [data-operator="join"]';
    const selectedPredicates =
      '[data-slot="dvt-substrait-join-predicate-editors"] fieldset:visible';
    cy.get(cards).last().parent().find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get(selectedPredicates)
      .should('have.length', 1)
      .and('contain.text', 'orders.')
      .and('not.contain.text', 'tickets.');
    cy.get(cards).first().click();
    cy.get(selectedPredicates).should('have.length', 1).and('contain.text', 'tickets.');
    cy.get(`${selectedPredicates} button[aria-label="Editar condición"]`).click();
    cy.get(`${selectedPredicates} select[aria-label="Comparador de la condición"]`).select(
      'not_equal'
    );
    cy.get(cards).last().click();
    cy.get(selectedPredicates).should('not.contain.text', 'tickets.');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get(cards).first().click();
    cy.get(`${selectedPredicates} select[aria-label="Comparador de la condición"]`).should(
      'have.value',
      'not_equal'
    );
    cy.get('[data-slot="canvas-relational-tree-draft-viewport"]').should('be.visible');
    cy.get(`${selectedPredicates} details`).first().find('summary').click();
    cy.get(
      `${selectedPredicates} select[aria-label="Añadir función exterior al operando izquierdo"]`
    ).select('LOWER');
    cy.get(`${selectedPredicates} [data-slot="semantic-operand-function-tree"]`)
      .first()
      .should('contain.text', 'LOWER(')
      .and('contain.text', 'customers.customer_id');
    cy.get(
      `${selectedPredicates} select[aria-label="Añadir función exterior al operando izquierdo"]`
    ).select('UPPER');
    cy.get(`${selectedPredicates} [data-slot="semantic-operand-function-tree"]`)
      .first()
      .should(($tree) => {
        const text = $tree.text();
        expect(text.indexOf('UPPER(')).to.be.lessThan(text.indexOf('LOWER('));
        expect(text.indexOf('LOWER(')).to.be.lessThan(text.indexOf('customers.customer_id'));
      });
    cy.get(`${selectedPredicates} button[aria-label="Retirar función 2"]`).click();
    cy.get(`${selectedPredicates} [data-slot="semantic-operand-function-tree"]`)
      .first()
      .should('not.contain.text', 'UPPER(')
      .and('contain.text', 'LOWER(')
      .and('contain.text', 'customers.customer_id');
    cy.get('[data-slot="canvas-operation-tree-tab"]:visible').click();
    cy.get('[data-slot="canvas-relational-expression-tree"]:visible')
      .should('contain.text', 'NOT_EQUAL')
      .and('contain.text', 'LOWER')
      .and('contain.text', 'customers.customer_id')
      .and('contain.text', 'tickets.customer_id');
    cy.screenshot('semantic-editor-contextual-join');
    cy.get('[data-slot="canvas-operation-properties-tab"]:visible').click();
    cy.contains(`${selectedPredicates} button`, 'Guardar condición').click();

    cy.get(`${selectedPredicates} button[aria-label="Añadir condición"]`).first().click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]')
      .contains('button', 'Añadir condición')
      .click();
    cy.get('[data-slot="canvas-operation-tree-tab"]:visible').click();
    cy.get('[data-slot="canvas-relational-expression-tree"]:visible').should(
      'contain.text',
      'LOWER'
    );
    cy.get('[data-slot="canvas-relational-collapse"]').click();
    cy.get('[data-slot="canvas-relational-tree-sources-toggle"]').click();
    verifyWheelZoom('[data-slot="canvas-relational-tree-draft-viewport"]');
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-draft-viewport"]');
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      4
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      3
    );
    cy.screenshot('semantic-editor-complete-tree');
    revealSemanticZoom('[data-slot="canvas-relational-tree-draft-viewport"]', 3);
    cy.get('[data-slot="canvas-relational-semantic-zoom"]')
      .filter(':contains("LOWER")')
      .should('have.length', 1)
      .closest('li')
      .scrollIntoView()
      .should('contain.text', 'customers.customer_id')
      .and('contain.text', 'tickets.customer_id');
    cy.screenshot('semantic-editor-zoom-nested-function');
    cy.get('[data-slot="canvas-relational-tree-detail"]:visible').should('not.exist');
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-draft-viewport"]');
    cy.get('[data-slot="canvas-relational-tree-sources-toggle"]').click();
    cy.wrap(null).should(() => expect(semanticWrites('join-transform')).to.have.length(0));

    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => {
      const write = semanticWrites('join-transform').at(-1);
      expect(write).not.to.equal(undefined);
      if (write == null) return;
      const inspection = inspectDvtSubstraitJoinDraft(
        decodeDvtSubstraitJoinDocument(semanticDocumentFromWrite(write))
      );
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      expect(inspection.projection.inputs).to.have.length(4);
      expect(inspection.projection.joinRelations).to.have.length(3);
      expect(
        inspection.projection.joins.map((join) => {
          const condition = join.conditions[0];
          return condition == null || condition.kind === 'group'
            ? null
            : (condition.operator ?? 'equal');
        })
      ).to.deep.equal(['equal', 'equal', 'not_equal']);
      const customerId = inspection.projection.inputs[0]?.fields.find(
        (field) => field.name === 'customer_id'
      )?.fieldId;
      expect(customerId).not.to.equal(undefined);
      [1, 2].forEach((joinIndex) => {
        const condition = inspection.projection.joins[joinIndex]?.conditions[0];
        if (condition == null || condition.kind === 'group') return;
        const operand = condition.left;
        if (joinIndex === 2) expect(operand.kind).to.equal('function');
        else expect(operand.kind).to.equal('field');
        expect(operand.kind === 'function' ? operand.input : operand).to.deep.include({
          kind: 'field',
          sourceFieldId: customerId,
        });
      });
    });
  });
});
