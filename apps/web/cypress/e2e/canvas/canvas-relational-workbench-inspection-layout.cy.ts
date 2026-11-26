/** Verify Properties inspection preserves the camera, dock and card positions. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

function inspectProperties(nodeId: string | null): void {
  if (nodeId === null) {
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    return;
  }

  const card = `.react-flow__node[data-id="${nodeId}"] [data-slot="graph-node-card-title"]`;
  const overview = '[data-slot="canvas-node-workbench-tab-general"]';
  cy.get(card).should('be.visible').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]')
    .should('be.visible')
    .and(($panel) => {
      expect($panel[0]!.tagName).to.equal('ASIDE');
      const bounds = $panel[0]!.getBoundingClientRect();
      expect(bounds.right).to.be.closeTo(1280, 30);
      expect(bounds.width).to.be.at.most(450);
    });
  cy.get(overview).should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-node-workbench-drag-handle"]').should('not.exist');

  if (nodeId === 'join-transform') return;

  const columns = '[data-slot="canvas-node-workbench-tab-columns"]';
  cy.get(columns).click();
  cy.get(columns).should('have.attr', 'aria-selected', 'true');
  // A second normal click on the same Source must reopen Overview.
  cy.get(card).click();
  cy.get(overview).should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-open-semantic-editor"]').should('not.exist');
}

function measureCanvasLayout(viewport: HTMLElement): Readonly<{
  viewport: HTMLElement;
  transform: string | null;
  host: DOMRect;
  dockWidth: number;
  cards: readonly Readonly<{ nodeId: string; x: number; y: number }>[];
}> {
  const document = viewport.ownerDocument;
  const host = document.querySelector('[data-testid="canvas-viewport"]')!;
  const dock = document.querySelector(
    '[data-slot="canvas-workspace-surface"] [data-slot="canvas-explorer-panel"]'
  )!;
  return {
    viewport,
    transform: viewport.getAttribute('style'),
    host: host.getBoundingClientRect(),
    dockWidth: dock.getBoundingClientRect().width,
    cards: ['source-customers', 'source-orders', 'join-transform'].map((nodeId) => {
      const bounds = document
        .querySelector(`.react-flow__node[data-id="${nodeId}"]`)!
        .getBoundingClientRect();
      return { nodeId, x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    }),
  };
}

function assertCanvasLayout(before: ReturnType<typeof measureCanvasLayout>, phase: string): void {
  cy.get<HTMLElement>('.react-flow__viewport').should(($viewport) => {
    const after = measureCanvasLayout($viewport[0]!);
    expect(after.viewport, `${phase}: viewport identity`).to.equal(before.viewport);
    expect(after.transform, `${phase}: viewport transform`).to.equal(before.transform);
    expect(after.dockWidth, `${phase}: visible Explorer width`).to.be.greaterThan(0);
    expect(after.dockWidth, `${phase}: Explorer width`).to.be.closeTo(before.dockWidth, 1);
    expect(after.host.left, `${phase}: Canvas host screen origin x`).to.be.closeTo(
      before.host.left,
      1
    );
    expect(after.host.top, `${phase}: Canvas host screen origin y`).to.be.closeTo(
      before.host.top,
      1
    );
    after.cards.forEach(({ nodeId, x, y }, index) => {
      const previous = before.cards[index]!;
      expect(x, `${phase}: ${nodeId} screen center x`).to.be.closeTo(previous.x, 1);
      expect(y, `${phase}: ${nodeId} screen center y`).to.be.closeTo(previous.y, 1);
    });
  });
}

function zoomCanvasOut(): void {
  cy.get<HTMLElement>('.react-flow__viewport').then(($viewport) => {
    const previousZoom = new DOMMatrix($viewport[0]!.style.transform).a;
    cy.get('.react-flow__controls-zoomout').click();
    cy.get<HTMLElement>('.react-flow__viewport').should(($current) => {
      expect(new DOMMatrix($current[0]!.style.transform).a).to.be.lessThan(previousZoom);
    });
  });
}

describe('Canvas Properties layout', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
  });

  for (const scenario of ['initial fit', 'zoomed out'] as const) {
    it(`keeps Canvas cards and zoom stationary while inspecting Properties (${scenario})`, () => {
      cy.viewport(1280, 720);
      visitWorkbenchCanvas();
      // Observe the fixture's initial fit before inspecting or zooming.
      cy.get<HTMLElement>('.react-flow__viewport').should(($viewport) => {
        expect($viewport[0]!.style.transform).to.contain('scale(0.82)');
      });
      if (scenario === 'zoomed out') zoomCanvasOut();

      cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').should(
        'have.attr',
        'aria-expanded',
        'true'
      );
      cy.get<HTMLElement>('.react-flow__viewport').then(($viewport) => {
        const before = measureCanvasLayout($viewport[0]!);
        expect(before.dockWidth, 'visible Explorer width before Properties').to.be.greaterThan(0);
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);

        const steps = [
          'source-customers',
          'source-orders',
          null,
          'source-customers',
          null,
          'join-transform',
          null,
        ];
        steps.forEach((nodeId, index) => {
          inspectProperties(nodeId);
          cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
          assertCanvasLayout(before, `${scenario} step ${index + 1} ${nodeId ?? 'close'}`);
          cy.then(() => {
            expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
          });
        });
      });
      cy.then(() => {
        const reads = getE2eApiCalls(/.*/)
          .filter((call) => /sample|preview/.test(call.url.pathname))
          .map((call) => call.url.pathname);
        expect(reads).to.deep.equal([]);
      });
    });
  }
});
