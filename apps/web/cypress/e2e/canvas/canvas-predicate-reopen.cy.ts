/** Predicate edits survive persistence without replacing relation or source-field identities. */
import { CanvasRelationAnalysisSession } from '../../../src/app/views/canvas/canvasRelationAnalysisSession';
import { querySelectedJoin } from '../../../src/app/views/canvas/canvasSelectedJoin';
import {
  prepareFieldSelection,
  openJoinWorkbench,
} from '../../support/relationalWorkbench/fieldSelection';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { savedOutputs } from '../../support/relationalWorkbench/savedOutputs';

describe('Canonical relation inspection', () => {
  it('exposes canonical code and keeps identities while re-editing a saved predicate', () => {
    prepareFieldSelection(2);
    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
    cy.get('[data-slot="canvas-node-workbench-code-content"]')
      .should('contain.text', 'Canonical Substrait document')
      .and('contain.text', 'SHA-256');
    cy.get('[data-testid="monaco-code-viewer"]').should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    openWorkbenchModel();
    let identities: unknown;
    for (const operator of ['gt', 'lt'] as const) {
      cy.get('[data-operator="join"]').click();
      cy.get('[aria-label="Comparador de la condición"]:visible').select(operator);
      cy.contains('button', 'Guardar condición').click();
      let writesBefore = 0;
      cy.then(() => {
        writesBefore = semanticWrites('join-transform').length;
      });
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() =>
        expect(semanticWrites('join-transform')).to.have.length(writesBefore + 1)
      );
      cy.wrap(null).should(() => expect(savedOutputs().predicates).to.have.length(1));
      cy.then(async () => {
        const saved = savedOutputs();
        const session = new CanvasRelationAnalysisSession('inspection');
        session.receive(saved.document);
        try {
          const selected = await querySelectedJoin(session, session.rootId, session.revision);
          const condition = selected.conditions?.[0];
          expect(condition?.kind === 'group' ? undefined : condition?.operator).to.equal(operator);
          const current = {
            relations: saved.document.sidecar.relations,
            sourceFields: saved.operands.map((operand) => operand.fields),
          };
          if (identities == null) identities = current;
          else expect(current).to.deep.equal(identities);
        } finally {
          session.dispose();
        }
      });
      visitWorkbenchCanvas();
      openWorkbenchModel();
    }
  });
});
