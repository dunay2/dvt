/** Enter operation discovery through the existing inspector and semantic editor. */
import { stubStatefulCanvasDraftAuthoring } from '../canvasDraftAuthoring';
import { stubE2eJsonApi } from '../e2eApiStub';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../workspaceSession';

export function stubPendingComposition(type: 'string' | 'bigint' = 'string'): void {
  cy.viewport(1400, 900);
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
  stubStatefulCanvasDraftAuthoring({
    substraitPendingComposition: true,
    substraitCompositionColumnType: type,
    title: 'Relational operation chooser',
  });
}
export function openPendingRelationalOperationChooser(): void {
  cy.get(
    '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
  ).rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', /^(Properties|Propiedades)$/).click();
  cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]')
    .should('be.visible')
    .and('not.contain.text', 'Needs predicate');
  cy.get('[data-slot="dvt-relational-operation-chooser"]').should('not.exist');
  cy.get('[data-slot="canvas-open-semantic-editor"]')
    .invoke('text')
    .should('match', /^(Open semantic editor|Abrir editor semántico)$/);
  cy.get('[data-slot="canvas-open-semantic-editor"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
  cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
  cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
  cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
  cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
  cy.get('[role="listbox"]').should('be.visible');
}
