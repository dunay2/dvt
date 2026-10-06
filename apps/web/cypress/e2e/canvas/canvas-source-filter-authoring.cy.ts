/**
 * Owned concern: prove filters belong to Transform and never to Source.
 * @baseline GH-3578: the Model card observes fields; its editor owns operation authoring.
 * @decision Connect the real source to Filter and publish through explicit Apply.
 * @consequence Source metadata stays unchanged while the canonical predicate survives reload.
 * @version 1.0.0
 */
import {
  DvtTransformAuthoringAuthorityV1Schema,
  WorkspaceGraphDraftSaveRequestSchema,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  connectWorkbenchProducer,
  dragWorkbenchSource,
  openWorkbenchModel,
  revisitWorkbenchCanvas,
  stageWorkbenchUnary,
} from '../../support/relationalWorkbench/navigation';
import { form } from '../../support/relationalWorkbench/operatorEditor';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubCanvas(): ReturnType<typeof stubStatefulCanvasDraftAuthoring> {
  stubShellBootstrapApis({ scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'] });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  return stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', columnMapping: true });
}

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function card(nodeId: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`.react-flow__node[data-id="${nodeId}"]`);
}

function openColumns(nodeId: string): void {
  card(nodeId).find('[data-slot="graph-node-card-title"]').rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
  cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
}

function latestNode(nodeId: string): WorkspaceGraphAuthoringNode | undefined {
  return WorkspaceGraphDraftSaveRequestSchema.parse(
    getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body
  ).draft.nodes.find((candidate) => candidate.id === nodeId);
}

describe('Canvas Source filter boundary', () => {
  it('keeps Source stable while a connected Transform authors and reloads the filter', () => {
    const sourceMetadata = stubCanvas().nodes.find((node) => node.id === 'source-orders')!.metadata;
    expect(sourceMetadata?.transformAuthoring).to.equal(undefined);
    cy.viewport(1920, 1080);
    visitCanvas();

    openColumns('source-orders');
    cy.get(form).should('not.exist');
    card('source-orders').should('not.contain.text', 'Filter');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    openWorkbenchModel('model-orders');
    dragWorkbenchSource('Orders source');
    stageWorkbenchUnary('filter', '[data-operator="read"]');
    cy.get(form).within(() => {
      cy.get('select').first().select('customer');
      cy.get('input').type('Ada');
      cy.get('button[type="submit"]').click();
    });
    cy.get('[data-operator="filter"]').closest('li').as('filter');
    connectWorkbenchProducer('@filter', '[data-slot="canvas-relational-output-input-port"]', null);
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    cy.wrap(null).should(() => {
      expect(latestNode('source-orders')!.metadata).to.deep.equal(sourceMetadata);
      const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
        latestNode('model-orders')!.metadata!.transformAuthoring
      );
      const indexed = indexSubstraitRelations(
        decodeDvtSubstraitSemanticDocument(authority.semanticDocument)
      );
      if (!indexed.ok) throw indexed.error;
      const filters = [...indexed.index.relations.values()].filter(
        (entry) => entry.relation.relType.case === 'filter'
      );
      expect(filters).to.have.length(1);
      expect(indexed.index.relations.has(filters[0]!.inputs[0]!)).to.equal(true);
    });

    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    revisitWorkbenchCanvas(visitCanvas);
    card('source-orders').should('not.contain.text', 'Filter');
    openWorkbenchModel('model-orders');
    cy.get('[data-operator="filter"]').should('have.length', 1).click();
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get(form).find('select').first().find('option:selected').should('have.text', 'customer');
    cy.get(form).find('input').should('have.value', 'Ada');
    cy.then(() => {
      expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });
});
