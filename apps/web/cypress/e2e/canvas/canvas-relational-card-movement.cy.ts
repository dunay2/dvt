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
const output = `${viewport} [data-slot="canvas-relational-tree-output"]`;
const position = (element: HTMLElement | undefined): [number, number] => {
  if (element === undefined) throw new Error('Expected the positioned workbench card.');
  const parent = element.parentElement;
  if (parent === null) throw new Error('Expected the workbench card position container.');
  return [Number.parseFloat(parent.style.left), Number.parseFloat(parent.style.top)];
};

describe('Relational card movement', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    verifyCompleteTreeFit(viewport);
    cy.get(viewport).should('have.css', 'cursor', 'default');
    cy.get(join).should('have.css', 'cursor', 'grab');
  });

  it('moves a JOIN and its ports at the actual zoom without opening properties or saving', () => {
    cy.get(join).then(($card) => {
      const before = position($card[0]);
      const tree = Cypress.$('[data-slot="canvas-relational-tree"]')[0];
      if (tree === undefined) throw new Error('Expected the relational tree zoom surface.');
      const zoom = Number(tree.style.zoom);
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
      cy.get('[data-slot="canvas-relational-edit"]').click();
      cy.get('[data-slot="canvas-relational-tree-draft-viewport"] [data-operator="join"]').should(
        ($editing) => {
          const after = position($editing[0]);
          expect(after[0]).to.be.closeTo(before[0] + 40 / zoom, 2);
          expect(after[1]).to.be.closeTo(before[1] + 24 / zoom, 2);
        }
      );
    });
  });

  it('moves a source with pointer and keyboard and retains normal card navigation', () => {
    cy.get(source).then(($card) => {
      const before = position($card[0]);
      const writes = semanticWrites('join-transform').length;
      cy.get(source).focus().type('{alt}{rightarrow}{alt}');
      cy.get(source).should(($moved) => {
        expect(position($moved[0])).to.deep.equal([before[0] + 10, before[1]]);
      });
      moveWorkbenchCard(source, 20, 12);
      cy.get(source).should(($moved) => {
        const after = position($moved[0]);
        expect(after[0]).to.be.greaterThan(before[0] + 10);
        expect(after[1]).to.be.greaterThan(before[1]);
      });
      verifyCompleteTreeFit(viewport);
      cy.get('[data-slot="canvas-relational-tree-arrange"]').click();
      cy.get(source).should(($arranged) => expect(position($arranged[0])).to.deep.equal(before));
      const relationId = $card.attr('data-relation-id')!;
      cy.get(source).click();
      cy.get(`[data-slot="canvas-relational-tree-node"][data-relation-id="${relationId}"]`).should(
        'have.attr',
        'aria-selected',
        'true'
      );
      cy.then(() => expect(semanticWrites('join-transform')).to.have.length(writes));
    });
  });

  it('reserves lexical detail around manual positions without remounting or saving on zoom', () => {
    cy.get(source).focus().type('{alt}{rightarrow}{alt}');
    const cards = '[data-slot="canvas-relational-tree-node"]';
    cy.get(cards).then(($before) => {
      const nodes = $before.toArray();
      const compact = nodes.map((card) => position(card));
      const writes = semanticWrites('join-transform').length;
      const requests = getE2eApiCalls(/data-sample/, 'GET').length;
      for (let step = 0; step < 5; step++)
        cy.get('[data-slot="canvas-model-editor"] button[aria-label="Zoom in"]').click();
      cy.get('[data-slot="canvas-relational-card-detail"]').should('have.length.greaterThan', 0);
      cy.get(cards).should(($expanded) => {
        expect($expanded.toArray()).to.deep.equal(nodes);
        const bounds = $expanded
          .toArray()
          .map((card) => card.closest('li')!.getBoundingClientRect());
        for (const [index, card] of bounds.entries()) {
          for (const other of bounds.slice(index + 1))
            expect(
              card.left < other.right &&
                card.right > other.left &&
                card.top < other.bottom &&
                card.bottom > other.top,
              'expanded cards overlap'
            ).to.equal(false);
        }
      });
      for (let step = 0; step < 5; step++)
        cy.get('[data-slot="canvas-model-editor"] button[aria-label="Zoom out"]').click();
      cy.get(cards).should(($collapsed) => {
        expect($collapsed.toArray()).to.deep.equal(nodes);
        expect($collapsed.toArray().map((card) => position(card))).to.deep.equal(compact);
      });
      cy.then(() => {
        expect(semanticWrites('join-transform')).to.have.length(writes);
        expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(requests);
      });
    });
  });

  it('drags through expanded spacing without a coordinate jump, remount or implicit request', () => {
    cy.get(join).closest('li').find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get('[data-slot="canvas-relational-card-detail"]').should('exist');
    cy.get(source).then(($card) => {
      const card = $card[0];
      const before = position(card);
      const tree = Cypress.$('[data-slot="canvas-relational-tree"]')[0];
      if (tree === undefined) throw new Error('Expected the relational tree zoom surface.');
      const zoom = Number(tree.style.zoom);
      const writes = semanticWrites('join-transform').length;
      const queries = /\/(data-sample|preview|runs|execute)(\/|$)/;
      const requests = getE2eApiCalls(queries).length;
      let displacement = 0;
      for (const delta of [220, -8, 8, -8, 8]) {
        displacement += delta;
        const expected = before[1] + displacement;
        moveWorkbenchCard(source, 0, delta * zoom);
        cy.get(source).should(($moved) => {
          expect($moved[0]).to.equal(card);
          expect(position($moved[0])[1]).to.be.closeTo(expected, 1);
        });
      }
      cy.then(() => {
        expect(semanticWrites('join-transform')).to.have.length(writes);
        expect(getE2eApiCalls(queries)).to.have.length(requests);
      });
    });
  });

  it('moves Output, selects its properties and disconnects the focused connection with Delete', () => {
    cy.get(output).then(($output) => {
      const initialOutput = $output[0];
      if (initialOutput === undefined) throw new Error('Expected the relational Output card.');
      const before: [number, number] = [
        Number.parseFloat(initialOutput.style.left),
        Number.parseFloat(initialOutput.style.top),
      ];
      const tree = Cypress.$('[data-slot="canvas-relational-tree"]')[0];
      if (tree === undefined) throw new Error('Expected the relational tree zoom surface.');
      const zoom = Number(tree.style.zoom);
      moveWorkbenchCard(output, 40, 24);
      cy.get(output).should(($moved) => {
        const moved = $moved[0];
        if (moved === undefined) throw new Error('Expected the moved relational Output card.');
        expect(Number.parseFloat(moved.style.left)).to.be.closeTo(before[0] + 40 / zoom, 2);
        expect(Number.parseFloat(moved.style.top)).to.be.closeTo(before[1] + 24 / zoom, 2);
        const edge = Cypress.$('[data-slot="canvas-relational-output-edge"]')[0];
        if (edge === undefined) throw new Error('Expected the relational Output connection.');
        const coordinates = edge
          .getAttribute('d')!
          .match(/-?[\d.]+/g)!
          .map(Number);
        expect(coordinates.at(-2)).to.be.closeTo(Number.parseFloat(moved.style.left) - 10, 2);
        expect(coordinates.at(-1)).to.be.closeTo(
          Number.parseFloat(moved.style.top) + moved.offsetHeight / 2,
          2
        );
      });
    });
    cy.get('[data-slot="canvas-relational-output-edge-action"]').click();
    cy.get('[data-slot="canvas-relational-output-edge"]').should('exist');
    cy.get('[data-slot="canvas-model-output-inspector"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-output-edge-action"]').type('{del}');
    cy.get('[data-slot="canvas-relational-output-edge"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-output-input-port"]').should(
      'not.have.attr',
      'data-connected'
    );
    // Finish this edit through the UI before the next case navigates away.
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-output-edge"]').should('exist');
    cy.get('[data-slot="canvas-relational-output-input-port"]').should(
      'have.attr',
      'data-connected',
      'true'
    );
    cy.get('[data-slot="canvas-relational-tree-cancel"]').should('not.exist');
  });

  for (const axis of ['horizontal', 'vertical'] as const) {
    it(`keeps the held card under the pointer when the ${axis} scrollable bounds contract`, () => {
      cy.get(join).click();
      cy.get(source).closest('li').find('[data-slot="canvas-relational-node-expand"]').click();
      for (let step = 0; step < 5; step++)
        cy.get('[data-slot="canvas-relational-tree-zoom"]')
          .siblings('button[aria-label="Zoom in"]')
          .click();
      if (axis === 'vertical') {
        cy.get(output).find('[data-slot="canvas-relational-tree-output-open"]').focus();
        for (let step = 0; step < 20; step++)
          cy.get(output)
            .find('[data-slot="canvas-relational-tree-output-open"]')
            .trigger('keydown', { key: 'ArrowDown', altKey: true, shiftKey: true });
      }
      cy.get(output).scrollIntoView();
      cy.get(viewport).then(($viewport) => {
        const surface = $viewport[0];
        if (surface === undefined) throw new Error('Expected the scrollable relational viewport.');
        if (axis === 'horizontal') {
          expect(surface.scrollWidth).to.be.greaterThan(surface.clientWidth);
          surface.scrollLeft = surface.scrollWidth;
        } else {
          expect(surface.scrollHeight).to.be.greaterThan(surface.clientHeight);
          surface.scrollTop = surface.scrollHeight;
        }
      });
      cy.get(output).then(($card) => {
        const held = $card[0];
        if (held === undefined) throw new Error('Expected the held relational Output card.');
        const before = held.getBoundingClientRect();
        const writes = semanticWrites('join-transform').length;
        const requests = getE2eApiCalls(/\/(data-sample|preview|runs|execute)(\/|$)/).length;
        const dx = axis === 'horizontal' ? -100 : 0;
        const dy = axis === 'vertical' ? -100 : 0;
        moveWorkbenchCard(output, dx, dy, (element, stepX, stepY) => {
          expect(element).to.equal(held);
          const bounds = element.getBoundingClientRect();
          const surface = element.closest(viewport)!;
          const layout = element.closest<HTMLElement>(
            '[data-slot="canvas-relational-tree-layout"]'
          )!;
          expect(
            bounds.left,
            `held card follows pointer ${JSON.stringify({ stepX, scroll: surface.scrollLeft, width: surface.scrollWidth, layout: layout.style.width, left: element.style.left, dragging: element.dataset.dragging })}`
          ).to.be.closeTo(before.left + stepX, 1);
          expect(bounds.top, 'held card follows vertical pointer').to.be.closeTo(
            before.top + stepY,
            1
          );
        });
        cy.get(output).should(($released) => {
          const released = $released[0];
          if (released === undefined)
            throw new Error('Expected the released relational Output card.');
          expect(released.getBoundingClientRect().left).to.be.closeTo(before.left + dx, 1);
          expect(released.getBoundingClientRect().top).to.be.closeTo(before.top + dy, 1);
        });
        verifyCompleteTreeFit(viewport);
        cy.then(() => {
          expect(semanticWrites('join-transform')).to.have.length(writes);
          expect(getE2eApiCalls(/\/(data-sample|preview|runs|execute)(\/|$)/)).to.have.length(
            requests
          );
        });
      });
    });
  }

  it('pans with the explicit hand without moving or selecting a card', () => {
    for (let step = 0; step < 5; step++)
      cy.get('[data-slot="canvas-model-editor"] button[aria-label="Zoom in"]').click();
    cy.get(source).scrollIntoView();
    cy.get('[data-slot="canvas-relational-tree-pan"]')
      .click()
      .should('have.attr', 'aria-pressed', 'true');
    cy.get(viewport).should('have.css', 'cursor', 'grab');
    cy.get(source).then(($card) => {
      const before = position($card[0]);
      const writes = semanticWrites('join-transform').length;
      cy.get(viewport).then(($viewport) => {
        const initialViewport = $viewport[0];
        if (initialViewport === undefined)
          throw new Error('Expected the panning relational viewport.');
        const scrollLeft = initialViewport.scrollLeft;
        moveWorkbenchCard(source, -40, 0);
        cy.get(viewport).should(($panned) => {
          const panned = $panned[0];
          if (panned === undefined) throw new Error('Expected the panned relational viewport.');
          expect(panned.scrollLeft).to.be.greaterThan(scrollLeft);
        });
      });
      cy.get(source).should(($same) => expect(position($same[0])).to.deep.equal(before));
      cy.get('[data-slot="canvas-relational-tree-inline-editor"]:visible').should('not.exist');
      cy.get('[data-slot="canvas-relational-tree-pan"]')
        .click()
        .should('have.attr', 'aria-pressed', 'false');
      cy.get(viewport).should('have.css', 'cursor', 'default');
      cy.get(source).should('have.css', 'cursor', 'grab');
      cy.then(() => expect(semanticWrites('join-transform')).to.have.length(writes));
    });
  });
});
