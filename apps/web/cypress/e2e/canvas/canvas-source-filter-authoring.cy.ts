/** Owned concern: prove filters belong to Transform and never to Source. */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { form } from '../../support/relationalWorkbench/operatorEditor';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type DraftSave = {
  draft: {
    nodes: Array<{ id: string; metadata?: Record<string, unknown> }>;
  };
};

function stubCanvas(): void {
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
  stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', columnMapping: true });
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

function latestNode(nodeId: string): DraftSave['draft']['nodes'][number] | undefined {
  return getE2eApiCalls('/workspace/graph/draft', 'PUT')
    .map((call) => call.body as DraftSave)
    .map((save) => save.draft.nodes.find((candidate) => candidate.id === nodeId))
    .filter((candidate) => candidate != null)
    .at(-1);
}

describe('Canvas Source filter boundary', () => {
  beforeEach(() => stubCanvas());

  it('keeps Source stable while a connected Transform authors and reloads the filter', () => {
    cy.viewport(1920, 1080);
    visitCanvas();

    openColumns('source-orders');
    cy.get(form).should('not.exist');
    card('source-orders').should('not.contain.text', 'Filter');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    card('model-orders').find('[data-slot="graph-node-column-toggle"]').click();
    card('model-orders').contains('button', 'Map compatible columns').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    let sourceMetadata: Record<string, unknown> | undefined;
    cy.then(() => {
      sourceMetadata = latestNode('source-orders')!.metadata;
      expect(sourceMetadata?.transformAuthoring).to.equal(undefined);
    });
    openWorkbenchModel('model-orders');
    workbenchOperation('filter').click();
    cy.get(form).within(() => {
      cy.get('select').first().select('customer');
      cy.get('input').type('Ada');
      cy.get('button[type="submit"]').click();
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    cy.wrap(null).should(() => {
      expect(latestNode('source-orders')!.metadata).to.deep.equal(sourceMetadata);
      const authority = latestNode('model-orders')!.metadata!.transformAuthoring as {
        semanticDocument: unknown;
      };
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

    visitCanvas();
    card('source-orders').should('not.contain.text', 'Filter');
    openWorkbenchModel('model-orders');
    cy.get('[data-operator="filter"]').should('have.length', 1).click();
    cy.get(form).find('select').first().find('option:selected').should('have.text', 'customer');
    cy.get(form).find('input').should('have.value', 'Ada');
  });
});
