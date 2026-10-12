/** Save/reopen the real UI; the controlled transport is not provider/database evidence. */
import {
  DvtRelationalAuthoringDraftV1Schema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  dragWorkbenchSource,
} from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Pending Read persistence coverage', () => {
  it('reopens complete identities and refuses an incomplete saved response without writing', () => {
    stubWorkbenchScenario('pending-chain');
    cy.viewport(1200, 680);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    dragWorkbenchSource('customers');
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    let savedDraft: WorkspaceGraphAuthoringDraft;
    let writes = 0;
    cy.wrap(null).should(() => {
      const call = getE2eApiCalls('/workspace/graph/draft', 'PUT').findLast((item) => {
        const { draft } = item.body as { draft: WorkspaceGraphAuthoringDraft };
        return draft.nodes.some(
          (node) => node.id === 'join-transform' && node.metadata?.relationalAuthoringDraft != null
        );
      });
      expect(call).not.to.equal(undefined);
      savedDraft = (call!.body as { draft: WorkspaceGraphAuthoringDraft }).draft;
      writes = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get('[data-pending="true"][data-operator="read"]').should('contain.text', 'customers');
    cy.screenshot('pending-read-complete-reopened');
    cy.then(() => {
      const model = savedDraft.nodes.find((node) => node.id === 'join-transform')!;
      const pending = DvtRelationalAuthoringDraftV1Schema.parse(
        model.metadata!.relationalAuthoringDraft
      );
      expect(pending.sources).to.have.length(1);
      expect(pending.sources[0]!.semanticDocument.sidecar.fields.length).to.be.greaterThan(1);
      pending.sources[0]!.semanticDocument.sidecar.fields.pop();
      // Deliberately malformed server response, not a successful save or a valid fixture.
      model.metadata!.relationalAuthoringDraft = pending;
      const canvas = savedDraft.canvases?.find(
        (item) => item.canvas.id === savedDraft.activeCanvasId
      );
      const scopedModel = canvas?.nodes.find((node) => node.id === model.id);
      if (scopedModel?.metadata != null) scopedModel.metadata.relationalAuthoringDraft = pending;
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    cy.get('[data-slot="canvas-error-state"]').should('be.visible');
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writes);
      expect(getE2eApiCalls(/\/data-sample$/, 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/runs', 'POST')).to.have.length(0);
    });
    cy.screenshot('pending-read-incomplete-rejected');
  });
});
