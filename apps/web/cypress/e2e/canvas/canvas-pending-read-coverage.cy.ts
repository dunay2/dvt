/** Save/reopen the real UI; the controlled transport is not provider/database evidence. */
import {
  DvtRelationalAuthoringDraftV1Schema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { getE2eApiCalls } from '../../support/e2eApiStub';
import { joinWorkbenchProducers } from '../../support/relationalWorkbench/joinChain';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  dragWorkbenchSource,
  connectWorkbenchProducer,
} from '../../support/relationalWorkbench/navigation';
import { savedOutputs } from '../../support/relationalWorkbench/savedOutputs';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

function savedPendingDraft(): {
  draft: WorkspaceGraphAuthoringDraft;
  pending: ReturnType<typeof DvtRelationalAuthoringDraftV1Schema.parse>;
} {
  const write = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1);
  expect(write, 'saved incomplete graph').not.to.equal(undefined);
  const { draft } = write!.body as { draft: WorkspaceGraphAuthoringDraft };
  const model = draft.nodes.find((node) => node.id === 'join-transform')!;
  return {
    draft,
    pending: DvtRelationalAuthoringDraftV1Schema.parse(model.metadata!.relationalAuthoringDraft),
  };
}

describe('Pending Read persistence coverage', () => {
  it('edits one detached occurrence Output through incomplete reload and terminal JOIN connection', () => {
    const seed = stubWorkbenchScenario('pending-join');
    const initialEdges = structuredClone(seed.edges);
    const initialSources = structuredClone(
      seed.nodes.filter((node) => node.id.startsWith('source-'))
    );
    expect(initialSources).to.have.length(2);
    const read = '[data-pending="true"][data-operator="read"]';
    const rows = '[data-slot="source-occurrence-outputs"]';
    const toggle = `${rows} [data-field-name="order_id"]`;
    let selectedId: string;
    let siblingId: string;
    let customerId: string;
    const selectRead = (id: string): void => {
      cy.get(`${read}[data-relation-id="${id}"]`).click();
    };
    const edit = (): void => {
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-canvas-inspector="true"] [data-slot="canvas-relational-edit"]')
        .should('have.text', 'Edit')
        .click();
      cy.get(`${rows} [role="checkbox"]`).should('not.exist');
    };
    const expectSavedSelection = (): void => {
      cy.wrap(null).should(() => {
        const { draft, pending } = savedPendingDraft();
        expect(pending.sources).to.have.length(3);
        expect(pending.operations).to.deep.equal([]);
        expect(pending.outputRelationId).to.equal(null);
        const selected = pending.sources.find((source) => source.relationId === selectedId)!;
        const sibling = pending.sources.find((source) => source.relationId === siblingId)!;
        const fields = selected.semanticDocument.sidecar.fields;
        expect(fields.map((field) => field.displayName)).to.deep.equal(['order_id', 'customer_id']);
        expect(selected.initialOutputFieldIds).to.deep.equal([
          fields.find((field) => field.displayName === 'customer_id')!.fieldId,
        ]);
        expect(sibling.initialOutputFieldIds).to.deep.equal(
          sibling.semanticDocument.sidecar.fields.map((field) => field.fieldId)
        );
        expect(draft.edges, 'Model Input bindings remain unchanged').to.deep.equal(initialEdges);
        expect(draft.nodes.filter((node) => node.id.startsWith('source-'))).to.deep.equal(
          initialSources
        );
        expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
    };

    cy.viewport(1440, 900);
    visitWorkbenchCanvas('es');
    openWorkbenchModel();
    dragWorkbenchSource('customers', { x: 60, y: 100 });
    cy.get(read)
      .last()
      .invoke('attr', 'data-relation-id')
      .then((id) => {
        customerId = id!;
      });
    dragWorkbenchSource('orders', { x: 60, y: 240 });
    cy.get(read)
      .last()
      .invoke('attr', 'data-relation-id')
      .then((id) => {
        selectedId = id!;
      });
    edit();
    cy.get(toggle).should('have.attr', 'data-included', 'true').focus().click();
    cy.get(toggle).should('have.attr', 'data-included', 'false').and('be.focused').click();
    cy.get(toggle).should('have.attr', 'data-included', 'true').click();
    cy.get(toggle).should('have.attr', 'data-included', 'false');
    cy.get('body').should('not.contain.text', 'Esta asignación de columna no está disponible');
    dragWorkbenchSource('orders', { x: 60, y: 380 });
    cy.get(read)
      .last()
      .invoke('attr', 'data-relation-id')
      .then((id) => {
        siblingId = id!;
      });
    edit();
    cy.get(toggle).should('have.attr', 'data-included', 'true');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    expectSavedSelection();
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Sincronizado');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas('es');
    openWorkbenchModel();
    cy.then(() => selectRead(selectedId));
    cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should(
      'not.contain.text',
      'order_id'
    );
    edit();
    cy.get(toggle).should('have.attr', 'data-included', 'false').click();
    cy.get(toggle).should('have.attr', 'data-included', 'true').click();
    cy.get(toggle).should('have.attr', 'data-included', 'false');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.then(() => selectRead(siblingId));
    cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should(
      'contain.text',
      'order_id'
    );
    expectSavedSelection();
    cy.then(() => {
      cy.get(`${read}[data-relation-id="${customerId}"]`).closest('li').as('customer');
      cy.get(`${read}[data-relation-id="${selectedId}"]`).closest('li').as('selectedOrders');
    });
    joinWorkbenchProducers('@customer', '@selectedOrders', 'terminalJoin');
    connectWorkbenchProducer(
      '@terminalJoin',
      '[data-slot="canvas-relational-output-input-port"]',
      null
    );
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.wrap(null).should(() => {
      const saved = savedOutputs();
      expect(saved.operands).to.have.length(2);
      expect(saved.operands.every((operand) => operand.fields.length === 2)).to.equal(true);
      expect(saved.predicates).to.have.length(1);
      expect(saved.outputs).to.have.length(3);
      expect(saved.outputs.map((field) => field.displayName)).not.to.include('order_id');
      const { draft, pending } = savedPendingDraft();
      const sibling = pending.sources.find((source) => source.relationId === siblingId);
      expect(sibling, 'unconnected duplicate occurrence survives').not.to.equal(undefined);
      expect(sibling!.initialOutputFieldIds).to.deep.equal(
        sibling!.semanticDocument.sidecar.fields.map((field) => field.fieldId)
      );
      expect(draft.edges).to.deep.equal(initialEdges);
      expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
    cy.get('body').should('not.contain.text', 'Esta asignación de columna no está disponible');
    cy.screenshot('pending-source-output-through-terminal-join');
  });

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
