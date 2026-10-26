/**
 * Owned concern: preserve field lifecycle evidence for binary and composed Model outputs.
 * @baseline GH-3578: current controls retain selection, focus, order and disconnection coverage.
 * @decision Reuse one inspector journey for two and three canonical source operands.
 * @consequence Reload must preserve outputs without rewriting operands or predicates.
 * @version 1.0.0
 */
import { ConnectedSourceRefSchema, WorkspaceGraphDraftSaveRequestSchema } from '@dvt/contracts';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../../src/app/services/workspace/workspaceGraphDraftProjection';
import { projectCanonicalNodeToAuthoringNode } from '../../../src/app/views/canvas/canvasDraftAuthoring';
import { encodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { normalizeProjectCanvasDraft } from '../../../src/app/views/canvas/canvasProjectCanvasLifecycle';
import { createSourceJoin } from '../../../src/app/views/canvas/canvasSourceJoin';
import { getE2eApiCalls, installE2eApiFetchStub } from '../../support/e2eApiStub';
import { proveCardOutputControls } from '../../support/relationalWorkbench/cardOutputControls';
import { proveEmptyJoinOutput } from '../../support/relationalWorkbench/emptyOutputs';
import { prepareFieldSelection } from '../../support/relationalWorkbench/fieldSelection';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { savedOutputs } from '../../support/relationalWorkbench/savedOutputs';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

/** Retain full physical Reads while reproducing the captured legacy partial Input bindings. */
function stubLegacySourceRecovery(): {
  draft: ReturnType<typeof stubWorkbenchScenario>;
  index: ReturnType<typeof deriveSubstraitSchemas>['index'];
  clientId: string;
  ordersId: string;
} {
  const draft = stubWorkbenchScenario('saved-join');
  const client = draft.nodes.find((node) => node.id === 'source-customers')!;
  const orders = draft.nodes.find((node) => node.id === 'source-orders')!;
  const model = draft.nodes.find((node) => node.id === 'join-transform')!;
  client.name = 'client';
  const clientRef = {
    ...ConnectedSourceRefSchema.parse(client.metadata!.connectedSourceRef),
    sourceObjectId: 'relation/dvt/public/client',
  };
  client.metadata = {
    ...client.metadata,
    tableName: 'client',
    connectedSourceRef: clientRef,
    columns: [
      { name: 'client_id', type: 'text' },
      { name: 'country', type: 'text' },
    ],
  };
  orders.metadata = {
    ...orders.metadata,
    columns: [
      { name: 'order_id', type: 'bigint' },
      { name: 'client_id', type: 'text' },
      { name: 'customer', type: 'text' },
      { name: 'amount', type: 'double' },
    ],
  };
  const document = createSourceJoin({
    left: {
      source: { nodeId: client.id, schema: 'public', table: 'client', sourceRef: clientRef },
      fields: ['client_id', 'country'],
      fieldTypes: ['string', 'string'],
    },
    right: {
      source: {
        nodeId: orders.id,
        schema: 'public',
        table: 'orders',
        sourceRef: ConnectedSourceRefSchema.parse(orders.metadata.connectedSourceRef),
      },
      fields: ['order_id', 'client_id', 'customer', 'amount'],
      fieldTypes: ['i64', 'string', 'string', 'fp64'],
    },
    leftFieldName: 'client_id',
    rightFieldName: 'client_id',
    targetNodeId: model.id,
    outputs: [
      { side: 0, fieldName: 'client_id', name: 'client_id' },
      { side: 1, fieldName: 'order_id', name: 'order_id' },
      { side: 1, fieldName: 'amount', name: 'amount' },
    ],
  });
  model.metadata = {
    ...model.metadata,
    transformAuthoring: {
      version: 'v1',
      mode: 'substrait',
      semanticDocument: encodeDvtSubstraitSemanticDocument(document),
    },
  };
  draft.edges = draft.edges.map((edge) => ({
    ...edge,
    metadata: {
      ...edge.metadata,
      inputBindings: {
        version: 'v1',
        fields: (edge.sourceId === client.id
          ? ['client_id']
          : ['order_id', 'client_id', 'amount']
        ).map((name) => ({ inputId: `input:${edge.sourceId}:${name}`, producerFieldId: name })),
      },
    },
  }));
  const { canonicalNodes } = projectWorkspaceGraphAuthoringDraftSemanticGraph(draft);
  Object.assign(
    draft,
    normalizeProjectCanvasDraft({
      ...draft,
      nodes: canonicalNodes.map(projectCanonicalNodeToAuthoringNode),
    })
  );
  const { index } = deriveSubstraitSchemas(document);
  return { draft, index, clientId: client.id, ordersId: orders.id };
}

describe('Canvas field lifecycle', () => {
  it('recovers one published Source field through its own Edit and atomically saves Input and Output', () => {
    const seed = stubLegacySourceRecovery();
    const initialSources = structuredClone(
      seed.draft.nodes.filter((node) => node.role === 'input')
    );
    const initialEdges = structuredClone(seed.draft.edges);
    const initialReads = [...seed.index.relations.values()].filter(
      (entry) => entry.relation.relType.case === 'read'
    );
    const clientRead = initialReads.find((entry) => entry.binding.displayName === 'client')!;
    const ordersRead = initialReads.find((entry) => entry.binding.displayName === 'orders')!;
    const clientCard = `[data-slot="canvas-relational-tree-node"][data-relation-id="${clientRead.binding.relationId}"]`;
    const ordersCard = `[data-slot="canvas-relational-tree-node"][data-relation-id="${ordersRead.binding.relationId}"]`;
    const rows = '[data-slot="source-occurrence-outputs"]:visible';
    const country = `${rows} [data-field-name="country"]`;
    const selectedOnly = '[role="checkbox"][aria-label="Selected fields only"]:visible';
    const ownEdit = (): void => {
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-canvas-inspector="true"]:visible [data-slot="canvas-relational-edit"]')
        .should('have.text', 'Edit')
        .click();
      cy.get(selectedOnly).should('have.attr', 'aria-checked', 'false');
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should('have.length', 2);
    };
    const noWrite = (): void => {
      cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    };
    const restore = (): void => {
      cy.get(country)
        .should('have.attr', 'data-included', 'false')
        .and('not.be.disabled')
        .focus()
        .then(($button) => {
          const button = $button[0]!;
          const row = button.closest('[data-slot="source-occurrence-output-field"]')!;
          const scroller = button.closest('[data-value="output"]')!;
          const card = button.ownerDocument.querySelector(clientCard)!;
          const box = card.getBoundingClientRect();
          const scroll = [scroller.scrollLeft, scroller.scrollTop];
          cy.wrap($button).click();
          cy.get(country)
            .should('have.attr', 'data-included', 'true')
            .and('be.focused')
            .should(($current) => {
              expect($current[0], 'same inclusion control').to.equal(button);
              expect(
                $current[0]!.closest('[data-slot="source-occurrence-output-field"]'),
                'same field row'
              ).to.equal(row);
              expect(
                [scroller.scrollLeft, scroller.scrollTop],
                'Output scroll stays put'
              ).to.deep.equal(scroll);
              const next = button.ownerDocument.querySelector(clientCard)!.getBoundingClientRect();
              for (const dimension of ['left', 'top', 'width', 'height'] as const)
                expect(next[dimension], `Source card ${dimension}`).to.be.closeTo(
                  box[dimension],
                  0.5
                );
            });
        });
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should('have.length', 2);
      noWrite();
    };
    cy.viewport(1440, 900);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    // A transaction opened elsewhere must not put a newly selected Source in local Edit.
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get(clientCard).click();
    cy.get(rows).should('contain.text', 'client_id').and('not.contain.text', 'country');
    ownEdit();
    cy.get(country).should('have.attr', 'data-included', 'false');
    cy.get(selectedOnly).click().should('have.attr', 'aria-checked', 'true');
    cy.get(country).should('not.exist');
    cy.get(selectedOnly).click().should('have.attr', 'aria-checked', 'false');
    restore();
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get(clientCard).click();
    cy.get(rows).should('not.contain.text', 'country');
    noWrite();
    ownEdit();
    restore();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.wrap(null).should(() => {
      const calls = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      expect(calls).to.have.length(1);
      const saved = WorkspaceGraphDraftSaveRequestSchema.parse(calls[0]!.body).draft;
      expect(
        saved.nodes.filter((node) => node.role === 'input'),
        'producer publications stay unchanged'
      ).to.deep.equal(initialSources);
      expect(
        saved.edges.find((edge) => edge.sourceId === seed.ordersId),
        'other Input stays unchanged'
      ).to.deep.equal(initialEdges.find((edge) => edge.sourceId === seed.ordersId));
      const binding = saved.edges.find((edge) => edge.sourceId === seed.clientId)!.metadata!
        .inputBindings as { fields: Array<{ producerFieldId: string }> };
      expect(binding.fields.map((field) => field.producerFieldId)).to.deep.equal([
        'client_id',
        'country',
      ]);
      const output = savedOutputs();
      expect(output.outputs.map((field) => field.displayName)).to.deep.equal([
        'client_id',
        'order_id',
        'amount',
        'country',
      ]);
      expect(output.operands, 'complete physical Reads').to.deep.equal(initialReads);
      const originalJoin = seed.index.relations.get(seed.index.rootId)!;
      expect(
        output.outputs.slice(0, 3),
        'existing occurrence outputs retain their identities'
      ).to.deep.equal(originalJoin.fields);
      expect(output.predicates[0]!.id).to.equal(originalJoin.binding.relationId);
      if (originalJoin.relation.relType.case !== 'join') throw new Error('Expected JOIN fixture');
      expect(output.predicates[0]!.inputs).to.deep.equal(originalJoin.inputs);
      expect(output.predicates[0]!.type).to.equal(originalJoin.relation.relType.value.type);
      expect(output.predicates[0]!.expression).to.deep.equal(
        originalJoin.relation.relType.value.expression
      );
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get(clientCard).click();
    cy.get(rows).should('contain.text', 'country');
    cy.get(`${rows} button`).should('not.exist');
    cy.get(ordersCard).click();
    cy.get(rows).should('not.contain.text', 'customer');
    cy.get('[data-canvas-inspector="true"]:visible [data-slot="canvas-relational-edit"]').click();
    cy.get(`${rows} [data-field-name="customer"]`).should('have.attr', 'data-included', 'false');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(1);
      expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  for (const sourceCount of [2, 3] as const) {
    it(`selects a Source occurrence contribution to Output with ${sourceCount} inputs and reload`, () => {
      prepareFieldSelection(sourceCount);
      openWorkbenchModel('join-transform');
      const source = '[data-slot="canvas-relational-tree-node"][data-operator="read"]';
      const rows = '[data-slot="source-occurrence-outputs"]';
      const toggle = `${rows} [data-field-name="name"]`;
      let excluded: ReturnType<typeof savedOutputs>;
      cy.get(source).first().click();
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should('contain.text', 'name');
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-relational-edit"]').should('have.text', 'Edit').click();
      cy.get(toggle).should('have.attr', 'data-included', 'true').focus().click();
      cy.get(toggle).should('have.attr', 'data-included', 'false').and('be.focused');
      cy.get(`${rows} [role="checkbox"]`).should('not.exist');
      cy.get(toggle).should('have.attr', 'data-included', 'false');
      cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should('contain.text', 'name');
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-relational-edit"]').should('have.text', 'Edit').click();
      cy.get(toggle).should('have.attr', 'data-included', 'true').click();
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should(
        'not.contain.text',
        'name'
      );
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        excluded = savedOutputs();
        expect(excluded.operands).to.have.length(sourceCount);
        expect(excluded.outputs.some((field) => field.displayName === 'name')).to.equal(false);
      });
      cy.on('window:before:load', installE2eApiFetchStub);
      cy.reload();
      openWorkbenchModel('join-transform');
      cy.get(source).first().click();
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-relational-edit"]').should('have.text', 'Edit').click();
      cy.get(toggle).should('have.attr', 'data-included', 'false').click();
      cy.get(toggle).should('have.attr', 'data-included', 'true');
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.get(`${rows} [data-slot="source-occurrence-output-field"]`).should('contain.text', 'name');
      cy.get(`${rows} button`).should('not.exist');
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        const restored = savedOutputs();
        expect(restored.outputs).to.have.length(excluded.outputs.length + 1);
        expect(restored.operands).to.deep.equal(excluded.operands);
        expect(restored.predicates).to.deep.equal(excluded.predicates);
      });
      cy.get('[data-slot="canvas-relational-tree-output-open"]').click();
      cy.get(
        '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-operation-output-tab"]'
      ).click();
      cy.get('[data-slot="canvas-model-output-inspector"] [data-slot="canvas-relational-edit"]')
        .should('have.text', 'Edit')
        .click();
      cy.get('[data-slot="relation-output-toggle"][data-field-name="name"]').should(
        'have.attr',
        'data-included',
        'true'
      );
      cy.screenshot(`source-occurrence-output-${sourceCount}-inputs`);
    });
    it(`preserves focus, output selection, ordering and reload with ${sourceCount} inputs`, () => {
      prepareFieldSelection(sourceCount);
      proveCardOutputControls(sourceCount);
    });
    it(`clears all outputs with ${sourceCount} inputs, disconnected sources and reload`, () => {
      prepareFieldSelection(sourceCount);
      proveEmptyJoinOutput(sourceCount);
    });
  }
});
