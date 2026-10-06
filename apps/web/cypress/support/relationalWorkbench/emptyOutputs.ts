/**
 * Owned concern: prove empty projections remain editable without physical Canvas edges.
 * @baseline GH-3578: disconnection must not rewrite canonical operands or predicates.
 * @decision Use real edge context actions and the current Model Output inspector.
 * @consequence Empty publication and re-inclusion must persist and survive reopen.
 * @version 1.0.0
 */
import { dragCanvasNodeByViewportDelta } from '../canvasGraphAuthoring';
import { getE2eApiCalls } from '../e2eApiStub';

import { openModelOutputs, reloadFieldSelection } from './fieldSelection';
import { savedOutputs } from './savedOutputs';

type CanvasDraftSaveRequestBody = { draft: { edges?: { targetId: string }[] } };

export function proveEmptyJoinOutput(sourceCount: number): void {
  const controls =
    '[data-slot="canvas-model-output-inspector"] [data-slot="relation-output-toggle"]';
  const stageEdges = '.react-flow__edge:not(.react-flow__edge-columnLineage)';
  let baseline: ReturnType<typeof savedOutputs>;
  const assertSaved = (outputCount?: number): void => {
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft').at(-1)?.method).to.equal('GET');
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)
        ?.body as CanvasDraftSaveRequestBody;
      expect(saved.draft.edges?.filter((edge) => edge.targetId === 'join-transform')).to.deep.equal(
        []
      );
      const inspected = savedOutputs();
      expect(inspected.operands).to.have.length(sourceCount);
      if (outputCount == null) baseline = inspected;
      else {
        expect(inspected.outputs).to.have.length(outputCount);
        if (baseline != null) {
          expect(inspected.operands).to.deep.equal(baseline.operands);
          expect(inspected.predicates).to.deep.equal(baseline.predicates);
        }
      }
    });
  };
  // Leave exposed connection segments: compact cards can cover a remaining edge
  // after its neighbouring connection is removed and the ports are measured again.
  dragCanvasNodeByViewportDelta('Customer Orders', { x: 160, y: 0 }, { nodeId: 'join-transform' });
  cy.get(stageEdges).then(($edges) => {
    for (let index = 0; index < $edges.length; index += 1) {
      cy.get<SVGPathElement>(`${stageEdges} .react-flow__edge-interaction`).then(($paths) => {
        // N-input edges can share a segment: remove an exposed edge, not the first DOM edge.
        const exposed = [...$paths]
          .map((path) => {
            const matrix = path.getScreenCTM()!;
            const points = Array.from({ length: 19 }, (_, index) =>
              path
                .getPointAtLength((path.getTotalLength() * (index + 1)) / 20)
                .matrixTransform(matrix)
            );
            const point = points.find(
              (point) => path.ownerDocument.elementFromPoint(point.x, point.y) === path
            );
            return point == null ? undefined : { path, point };
          })
          .find((candidate) => candidate != null);
        expect(exposed, 'visible connection segment').not.to.equal(undefined);
        const { path, point } = exposed!;
        // Cypress checks actionability at the exposed segment, not the empty
        // bounding-box centre of this curved SVG path.
        const bounds = path.getBoundingClientRect();
        cy.wrap(path).rightclick(point.x - bounds.left, point.y - bounds.top, {
          scrollBehavior: false,
        });
      });
      cy.contains('[data-slot="canvas-context-menu-item"]', 'Remove connection').click();
      cy.get(stageEdges).should('have.length', $edges.length - index - 1);
    }
  });
  assertSaved();
  openModelOutputs();
  cy.get(`${controls}[data-included="true"]`).should(($selected) => {
    expect(baseline != null && baseline.outputs.length).to.equal($selected.length);
  });
  cy.get(`${controls}[data-included="true"]`).then(($selected) => {
    [...$selected].forEach((control, index) => {
      const $control = Cypress.$(control);
      cy.wrap($control).should('be.enabled').and('have.attr', 'data-included', 'true').click();
      cy.wrap($control).should('have.attr', 'data-included', 'false');
      assertSaved($selected.length - index - 1);
    });
  });
  cy.get(controls).should('have.attr', 'data-included', 'false');
  cy.get(`${controls}[data-included="true"]`).should('not.exist');
  reloadFieldSelection();
  cy.get(controls).should('have.attr', 'data-included', 'false');
  cy.get(`${controls}[data-included="true"]`).should('not.exist');
  cy.screenshot(`empty-${sourceCount}-input-join`, { capture: 'viewport' });
  cy.get(controls).first().should('be.enabled').click();
  assertSaved(1);
  cy.get(`${controls}[data-included="true"]`).should('have.length', 1);
}
