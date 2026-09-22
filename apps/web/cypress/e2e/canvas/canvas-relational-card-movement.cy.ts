/** Owned concern: real card gestures move geometry without invoking semantic commands or queries. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { verifyCompleteTreeFit } from '../../support/relationalWorkbench/geometry';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { moveWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const viewport = '[data-slot="canvas-relational-tree-viewport"]';
const join = `${viewport} [data-slot="canvas-relational-tree-node"][data-operator="join"]`;
const source = `${viewport} [data-slot="canvas-relational-tree-node"][data-operator="read"]:first`;
const position = (element: HTMLElement): number[] => [
  Number.parseFloat(element.parentElement!.style.left),
  Number.parseFloat(element.parentElement!.style.top),
];

describe('Relational card movement', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    verifyCompleteTreeFit(viewport);
  });

  it('moves a JOIN and its ports at the actual zoom without opening properties or saving', () => {
    cy.get(join).then(($card) => {
      const before = position($card[0]);
      const zoom = Number(
        (Cypress.$('[data-slot="canvas-relational-tree"]')[0] as HTMLElement).style.zoom
      );
      const writes = semanticWrites('join-transform').length;
      const dataRequests = /\/(data-sample|preview|runs|execute)(\/|$)/;
      const requests = getE2eApiCalls(dataRequests).length;
      moveWorkbenchCard(join, 40, 24);
      cy.get(join).should(($moved) => {
        const after = position($moved[0]);
        expect(after[0]).to.be.closeTo(before[0] + 40 / zoom, 2);
        expect(after[1]).to.be.closeTo(before[1] + 24 / zoom, 2);
      });
      cy.get('[data-slot="canvas-relational-tree-input-label"]')
        .first()
        .should(($port) => {
          const coordinates = $port
            .attr('transform')!
            .match(/[\d.]+/g)!
            .map(Number);
          expect(coordinates[0]).to.be.closeTo(before[0] + 40 / zoom - 24, 2);
        });
      cy.get('[data-slot="canvas-relational-tree-inline-editor"]:visible').should('not.exist');
      cy.get(viewport).should('have.attr', 'data-panning', 'false');
      cy.then(() => {
        expect(semanticWrites('join-transform')).to.have.length(writes);
        expect(getE2eApiCalls(dataRequests)).to.have.length(requests);
      });
      cy.get(join).click();
      cy.get('[data-slot="canvas-relational-tree-inline-editor"]').should('be.visible');
      cy.get('[data-slot="canvas-relational-tree-draft-viewport"] [data-operator="join"]').should(
        ($editing) => {
          const after = position($editing[0]);
          expect(after[0]).to.be.closeTo(before[0] + 40 / zoom, 2);
          expect(after[1]).to.be.closeTo(before[1] + 24 / zoom, 2);
        }
      );
    });
  });

  it('moves a source using the keyboard and retains normal card navigation', () => {
    cy.get(source).then(($card) => {
      const before = position($card[0]);
      const writes = semanticWrites('join-transform').length;
      cy.get(source).focus().type('{alt}{rightarrow}{alt}');
      cy.get(source).should(($moved) => {
        expect(position($moved[0])).to.deep.equal([before[0] + 10, before[1]]);
      });
      cy.get(source).click().should('have.attr', 'aria-selected', 'true');
      cy.then(() => expect(semanticWrites('join-transform')).to.have.length(writes));
    });
  });
});
