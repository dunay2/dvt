/**
 * Owned concern: prove empty projections remain editable without physical Canvas edges.
 * @baseline GH-3578: disconnection must not rewrite canonical operands or predicates.
 * @decision Wait for each canonical save ACK before measuring the next real edge gesture.
 * @consequence Empty publication and re-inclusion must persist and survive reopen.
 * @version 1.0.0
 */
import { WorkspaceGraphDraftSaveRequestSchema } from '@dvt/contracts';

import { dragCanvasNodeByViewportDelta } from '../canvasGraphAuthoring';
import { getE2eApiCalls } from '../e2eApiStub';

import { openModelOutputs, reloadFieldSelection } from './fieldSelection';
import { savedOutputs } from './savedOutputs';

function waitForSavedEdges($edges: JQuery<HTMLElement>): void {
  const ids = [...$edges].map((edge) => edge.getAttribute('data-id'));
  expect(ids).not.to.include(null);
  expect(new Set(ids).size).to.equal(ids.length);
  cy.wrap(null).should(() => {
    const calls = getE2eApiCalls('/workspace/graph/draft');
    const put = calls.filter((call) => call.method === 'PUT').at(-1);
    expect(put, 'latest canonical save').not.to.equal(undefined);
    const saved = WorkspaceGraphDraftSaveRequestSchema.parse(put!.body);
    expect(saved.draft.edges.map((edge) => edge.id)).to.have.members(ids);
    expect(
      calls.slice(calls.indexOf(put!) + 1).some((call) => call.method === 'GET'),
      'fresh draft query after this save'
    ).to.equal(true);
  });
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
}

export function proveEmptyJoinOutput(sourceCount: number): void {
  const controls =
    '[data-slot="canvas-model-output-inspector"] [data-slot="relation-output-toggle"]';
  const stageEdges = '.react-flow__edge:not(.react-flow__edge-columnLineage)';
  let baseline: ReturnType<typeof savedOutputs>;
  const assertSaved = (outputCount?: number): void => {
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft').at(-1)?.method).to.equal('GET');
      const saved = WorkspaceGraphDraftSaveRequestSchema.parse(
        getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body
      );
      expect(saved.draft.edges.filter((edge) => edge.targetId === 'join-transform')).to.deep.equal(
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
      // Re-query an exposed center as handles settle after each save. Cypress
      // measures its current center and retains all native actionability checks.
      cy.get<SVGPathElement>(`${stageEdges} .react-flow__edge-interaction`)
        .filter<SVGPathElement>((_, path) => {
          const bounds = path.getBoundingClientRect();
          return (
            path.ownerDocument.elementFromPoint(
              bounds.left + bounds.width / 2,
              bounds.top + bounds.height / 2
            ) === path
          );
        })
        .first()
        .should('be.visible')
        .rightclick('center', { scrollBehavior: false });
      cy.contains('[data-slot="canvas-context-menu-item"]', 'Remove connection').click();
      cy.get(stageEdges)
        .should('have.length', $edges.length - index - 1)
        .then(waitForSavedEdges);
    }
  });
  assertSaved();
  openModelOutputs();
  cy.get(`${controls}[data-included="true"]`).should(($selected) => {
    expect(baseline != null && baseline.outputs.length).to.equal($selected.length);
  });
  cy.get(`${controls}[data-included="true"]`).then(({ length }) => {
    for (let index = 0; index < length; index += 1) {
      const remaining = length - index - 1;
      cy.get(`${controls}[data-included="true"]`)
        .first()
        .should('be.enabled')
        .and('not.have.attr', 'aria-disabled', 'true')
        .click();
      cy.get(`${controls}[data-included="true"]`).should('have.length', remaining);
      assertSaved(remaining);
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    }
  });
  cy.get(controls).should('have.attr', 'data-included', 'false');
  cy.get(`${controls}[data-included="true"]`).should('not.exist');
  reloadFieldSelection();
  cy.get(controls).should('have.attr', 'data-included', 'false');
  cy.get(`${controls}[data-included="true"]`).should('not.exist');
  cy.screenshot(`empty-${sourceCount}-input-join`, { capture: 'viewport' });
  cy.get(controls)
    .first()
    .should('be.enabled')
    .and('not.have.attr', 'aria-disabled', 'true')
    .click();
  assertSaved(1);
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
  cy.get(`${controls}[data-included="true"]`).should('have.length', 1);
}
