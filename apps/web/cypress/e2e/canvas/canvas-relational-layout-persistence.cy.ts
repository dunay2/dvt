/** Completed operations keep layout, never a historical terminal snapshot. */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import { verifyCompleteTreeFit } from '../../support/relationalWorkbench/geometry';
import {
  connectWorkbenchProducer,
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  semanticDocumentFromWrite,
  semanticWrites,
} from '../../support/relationalWorkbench/persistence';
import { moveWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Completed relational layout persistence', () => {
  it('keeps moved cards through Apply, reload and a later canonical root insertion', () => {
    stubWorkbenchScenario('saved-join');
    cy.viewport(1440, 900);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-viewport"]');
    // Settle the fixture's initial workspace save before measuring gesture writes.
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    const join = '[data-slot="canvas-relational-tree-node"][data-operator="join"]';
    let relationId = '';
    let moved = { x: 0, y: 0 };
    let rootId = '';
    let baselineWrites = 0;
    cy.then(() => {
      baselineWrites = semanticWrites('join-transform').length;
    });
    moveWorkbenchCard(join, 40, 48);
    cy.get(join).then(($card) => {
      relationId = $card.attr('data-relation-id')!;
      moved = {
        x: parseFloat($card[0].parentElement!.style.left),
        y: parseFloat($card[0].parentElement!.style.top),
      };
    });
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(baselineWrites));

    for (const iteration of [1, 2]) {
      // Each new root must supersede the previous root; retained layout has no terminal authority.
      cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
      workbenchOperation('filter').click();
      if (iteration === 1) cy.get(join).closest('li').as('producer');
      else
        cy.then(() =>
          cy
            .get(`[data-slot="canvas-relational-tree-node"][data-relation-id="${rootId}"]`)
            .closest('li')
            .as('producer')
        );
      cy.get('[data-pending-operation="true"]').last().as('filter');
      connectWorkbenchProducer('@producer', '@filter');
      cy.get('[data-slot="canvas-relational-operator-form"] input').type('active');
      cy.get('[data-slot="canvas-relational-operator-form"] button[type="submit"]').click();
      connectWorkbenchProducer(
        '@filter',
        '[data-slot="canvas-relational-output-input-port"]',
        null
      );
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.wrap(null).should(() => {
        const writes = semanticWrites('join-transform');
        expect(writes).to.have.length(baselineWrites + iteration);
        const { draft } = writes.at(-1)!.body as { draft: WorkspaceGraphAuthoringDraft };
        const retained = draft.nodes.find((node) => node.id === 'join-transform')?.metadata
          ?.relationalAuthoringDraft;
        expect(retained).to.deep.equal({
          version: 'v1',
          sources: [],
          operations: [],
          positions: (retained as { positions: unknown }).positions,
        });
        expect(
          (retained as { positions: Record<string, unknown> }).positions[relationId]
        ).to.deep.equal(moved);
        expect(
          Object.keys((retained as { positions: Record<string, unknown> }).positions)
        ).to.deep.equal([relationId]);
        const { index } = deriveSubstraitSchemas(
          decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(writes.at(-1)!))
        );
        expect(
          [...index.relations.values()].filter((entry) => entry.relation.relType.case === 'filter')
        ).to.have.length(iteration);
        rootId = index.rootId;
      });
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      visitWorkbenchCanvas();
      openWorkbenchModel();
      cy.get(join).should(($card) => {
        expect(parseFloat($card[0].parentElement!.style.left)).to.be.closeTo(moved.x, 1);
        expect(parseFloat($card[0].parentElement!.style.top)).to.be.closeTo(moved.y, 1);
      });
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="filter"]').should(
        'have.length',
        iteration
      );
      cy.get('[data-slot="canvas-relational-output-edge"]').should('exist');
      cy.get('[data-slot="canvas-relational-tree-output"]').should(($output) => {
        const root = $output[0].ownerDocument.querySelector(
          `[data-slot="canvas-relational-tree-node"][data-relation-id="${rootId}"]`
        )!;
        expect($output[0].getBoundingClientRect().left).to.be.greaterThan(
          root.getBoundingClientRect().right
        );
      });
      cy.then(() => {
        expect(semanticWrites('join-transform')).to.have.length(baselineWrites + iteration);
        expect(getE2eApiCalls(/\/(data-sample|preview|runs|execute)(\/|$)/)).to.have.length(0);
      });
    }
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-viewport"]');
    cy.screenshot('layout-retained-canonical-root', { capture: 'viewport' });
  });
});
