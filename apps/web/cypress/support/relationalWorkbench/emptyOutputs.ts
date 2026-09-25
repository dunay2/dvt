/** Empty projections remain editable independently of connected Canvas edges. */
import { dragCanvasNodeByViewportDelta } from '../canvasGraphAuthoring';
import { getE2eApiCalls } from '../e2eApiStub';

import { toggleColumns, reloadFieldSelection } from './fieldSelection';
import { savedOutputs } from './savedOutputs';

type CanvasDraftSaveRequestBody = { draft: { edges?: { targetId: string }[] } };

export function proveEmptyJoinOutput(sourceCount: number): void {
  const card = '.react-flow__node[data-id="join-transform"]';
  const controls = `${card} [data-slot="graph-node-column-output-state"]`;
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
        const canvas = path.closest<HTMLElement>('.react-flow')!;
        const bounds = canvas.getBoundingClientRect();
        cy.wrap(canvas).rightclick(point.x - bounds.left, point.y - bounds.top, {
          scrollBehavior: false,
        });
      });
      cy.contains('[data-slot="canvas-context-menu-item"]', 'Remove connection').click();
      cy.get(stageEdges).should('have.length', $edges.length - index - 1);
    }
  });
  assertSaved();
  toggleColumns('join-transform');
  cy.get(`${controls}[aria-pressed="true"]`).should(($selected) => {
    expect(baseline != null && baseline.outputs.length).to.equal($selected.length);
  });
  cy.get(`${controls}[aria-pressed="true"]`).then(($selected) => {
    const names = [...$selected].map(
      (element) => element.closest<HTMLElement>('[data-column-name]')!.dataset.columnName!
    );
    names.forEach((name, index) => {
      const selector = `${card} [data-column-name="${name}"] [data-slot="graph-node-column-output-state"]`;
      cy.get(selector).should('have.attr', 'aria-pressed', 'true').click();
      cy.get(selector).should('have.attr', 'aria-pressed', 'false');
      assertSaved(names.length - index - 1);
    });
  });
  cy.get(controls).should('have.attr', 'aria-pressed', 'false');
  cy.get(`${controls}[aria-pressed="true"]`).should('not.exist');
  reloadFieldSelection();
  cy.get(controls).should('have.attr', 'aria-pressed', 'false');
  cy.get(`${controls}[aria-pressed="true"]`).should('not.exist');
  cy.screenshot(`empty-${sourceCount}-input-join`, { capture: 'viewport' });
  cy.get(controls).first().click();
  assertSaved(1);
  cy.get(`${controls}[aria-pressed="true"]`).should('have.length', 1);
}
