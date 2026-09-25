/** Discovery, cancellation and predicate authoring use the same canonical command rail. */
import { CanvasRelationAnalysisSession } from '../../../src/app/views/canvas/canvasRelationAnalysisSession';
import { querySelectedJoin } from '../../../src/app/views/canvas/canvasSelectedJoin';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import {
  openPendingRelationalOperationChooser,
  stubPendingComposition,
} from '../../support/relationalWorkbench/pendingComposition';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { savedOutputs } from '../../support/relationalWorkbench/savedOutputs';

describe('Canonical operation discovery', () => {
  it('opens with the keyboard and cancels without saving semantic authority', () => {
    stubPendingComposition();
    visitWorkbenchCanvas();
    openPendingRelationalOperationChooser();
    cy.get('[role="combobox"]').type('INNER JOIN{enter}');
    cy.get('[data-operator="join"]').should('have.length', 1);
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree-block-canvas"]').should('be.visible');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
  });
  it('saves a composed field expression and literal predicate only after Apply', () => {
    stubPendingComposition();
    visitWorkbenchCanvas();
    openPendingRelationalOperationChooser();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.get('[data-operator="join"]').click();
    cy.get('[aria-label="Editar condición"]').click();
    cy.get('[aria-label="Tipo del operando derecho"]').select('literal');
    cy.get('[aria-label="Valor literal del operando derecho"]').type('1');
    cy.get('[data-slot="semantic-workbench-join-izquierdo-operand"] summary').click();
    cy.get('[aria-label="Añadir función exterior al operando izquierdo"]').select('LOWER');
    cy.get('[aria-label="Comparador de la condición"]').select('not_equal');
    cy.contains('button', 'Guardar condición').click();
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null, { timeout: 20_000 }).should(() =>
      expect(semanticWrites('join-transform')).to.have.length(1)
    );
    cy.then(async () => {
      const session = new CanvasRelationAnalysisSession('inspection');
      session.receive(savedOutputs().document);
      try {
        const selected = await querySelectedJoin(session, session.rootId, session.revision);
        const condition = selected.conditions?.[0];
        if (condition == null || condition.kind === 'group')
          throw new Error('Missing authored predicate');
        expect(condition.operator).to.equal('not_equal');
        expect(condition.right).to.deep.equal({
          kind: 'literal',
          literal: { dataType: 'string', value: '1' },
        });
        expect(condition.left.kind).to.equal('function');
      } finally {
        session.dispose();
      }
    });
  });
  it('derives the predicate type from bigint operands', () => {
    stubPendingComposition('bigint');
    visitWorkbenchCanvas();
    openPendingRelationalOperationChooser();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.get('[data-operator="join"]').click();
    cy.get('[aria-label="Editar condición"]').click();
    cy.get('[aria-label="Tipo de dato de la condición"]').should('have.value', 'i64');
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null, { timeout: 20_000 }).should(() =>
      expect(semanticWrites('join-transform')).to.have.length(1)
    );
    cy.then(async () => {
      const session = new CanvasRelationAnalysisSession('inspection');
      session.receive(savedOutputs().document);
      try {
        const selected = await querySelectedJoin(session, session.rootId, session.revision);
        const condition = selected.conditions?.[0];
        if (
          condition == null ||
          condition.kind === 'group' ||
          condition.left.kind !== 'field' ||
          condition.right.kind !== 'field'
        )
          throw new Error('Missing field predicate');
        const types = new Map(
          selected.inputs.flatMap((input) =>
            input.bindings.map((binding) => [
              binding.fieldId,
              input.fields[binding.outputOrdinal]!.type.kind.case,
            ])
          )
        );
        expect(types.get(condition.left.sourceFieldId)).to.equal('i64');
        expect(types.get(condition.right.sourceFieldId)).to.equal('i64');
      } finally {
        session.dispose();
      }
    });
  });
});
