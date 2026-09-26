/** Explicit editing protects local predicates and persists their canonical source lineage. */
import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { CanvasRelationAnalysisSession } from '../../../src/app/views/canvas/canvasRelationAnalysisSession';
import { querySelectedJoin } from '../../../src/app/views/canvas/canvasSelectedJoin';
import { authorFourSourceChain } from '../../support/relationalWorkbench/joinChain';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench predicates', () => {
  it('inspects first, protects a pending edit and saves nested functions with source lineage', () => {
    stubWorkbenchScenario('pending-chain');
    authorFourSourceChain();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => expect(semanticWrites('join-transform')).to.have.length(1));
    const cards = '[data-slot="canvas-relational-tree-node"][data-operator="join"]';
    const editor = '[data-slot="dvt-substrait-join-predicate-editors"]:visible';
    cy.get(cards).first().click();
    cy.get('[data-slot="canvas-relational-tree-inline-editor"]:visible').should(
      'not.have.descendants',
      'input, select, textarea'
    );
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get(`${editor} [aria-label="Editar condición"]`).first().click();
    cy.get(editor).should('have.length', 1).and('contain.text', 'tickets');
    cy.get(`${editor} [aria-label="Comparador de la condición"]`).select('not_equal');
    cy.get('[data-slot="canvas-model-actions"] [role="status"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get(`${editor} [aria-label="Comparador de la condición"]`).should('have.value', 'not_equal');
    cy.get(cards).last().click();
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.contains('[role="alertdialog"] button', 'Seguir editando').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get(`${editor} [aria-label="Comparador de la condición"]`).should('have.value', 'not_equal');
    cy.get(`${editor} details`).first().find('summary').click();
    const functions = `${editor} [aria-label="Añadir función exterior al operando izquierdo"]`;
    cy.get(functions).select('LOWER');
    cy.get(functions).select('UPPER');
    cy.get(`${editor} [data-slot="semantic-operand-function-tree"]`)
      .first()
      .should('contain.text', 'UPPER(')
      .and('contain.text', 'LOWER(');
    cy.get('[data-slot="canvas-operation-tree-tab"]:visible').click();
    cy.get('[data-slot="canvas-relational-expression-tree"]:visible')
      .should('contain.text', 'NOT_EQUAL')
      .and('contain.text', 'UPPER')
      .and('contain.text', 'LOWER');
    cy.get('[data-slot="canvas-operation-properties-tab"]:visible').click();
    cy.contains(`${editor} button`, 'Guardar condición').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(1));
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => expect(semanticWrites('join-transform')).to.have.length(2));
    cy.get('[data-slot="canvas-relational-tree-inline-editor"]:visible')
      .should('not.have.descendants', 'input, select, textarea')
      .and('contain.text', 'UPPER');
    cy.then(async () => {
      const document = decodeDvtSubstraitSemanticDocument(
        semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!)
      );
      const session = new CanvasRelationAnalysisSession('reopened');
      session.receive(document);
      try {
        const joins = document.sidecar.relations
          .filter(
            (binding) =>
              session.locate(binding.relationId, session.revision).relation.relType.case === 'join'
          )
          .sort((left, right) => left.relAnchor - right.relAnchor);
        expect(joins).to.have.length(3);
        const selected = await Promise.all(
          joins.map((join) => querySelectedJoin(session, join.relationId, session.revision))
        );
        expect(
          selected.map((join) => {
            const condition = join.conditions?.[0];
            return condition?.kind === 'group' ? undefined : condition?.operator;
          })
        ).to.deep.equal(['equal', 'equal', 'not_equal']);
        const condition = selected[2]!.conditions![0]!;
        if (
          condition.kind === 'group' ||
          condition.left.kind !== 'function' ||
          condition.left.input.kind !== 'function' ||
          condition.left.input.input.kind !== 'field'
        )
          throw new Error('Expected a nested function applied to the selected input field');
        const fieldId = condition.left.input.input.sourceFieldId;
        const input = selected[2]!.inputs[0]!;
        const field = input.bindings.find((binding) => binding.fieldId === fieldId)!;
        const physicalIds = input.fields[field.outputOrdinal]!.sourceFieldIds;
        const physical = document.sidecar.fields.filter((binding) =>
          physicalIds.includes(binding.fieldId)
        );
        expect(
          physical.some(
            (binding) =>
              binding.displayName === 'customer_id' &&
              document.sidecar.relations.find(
                (relation) => relation.relationId === binding.relationId
              )?.sourceRef?.sourceObjectId === 'relation/dvt/public/customers'
          )
        ).to.equal(true);
      } finally {
        session.dispose();
      }
    });
  });
});
