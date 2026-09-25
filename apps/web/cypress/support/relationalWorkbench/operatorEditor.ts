/** Real Canvas interactions shared by operator lifecycle browser tests. */
import { stubStatefulCanvasDraftAuthoring } from '../canvasDraftAuthoring';
import { stubE2eJsonApi, waitForE2eApiCall } from '../e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../workspaceSession';

import { workbenchOperation } from './operationMenu';
export const form = '[data-slot="canvas-relational-operator-form"]';
export const modalForm = '[role="dialog"][data-slot="canvas-relational-operator-form"]';
export function openEditor(union = false, readOnly = false, nInput = false): void {
  stubShellBootstrapApis({
    scopes: readOnly
      ? ['workspace:graph-draft:view']
      : ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
  });
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
    substraitUnionAll: union,
    substraitInnerJoin: !union,
    substraitNInputJoin: nInput,
    readOnly,
  });
  cy.viewport(1440, 900);
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  cy.get('[data-slot="canvas-workspace-tab"]')
    .should('have.attr', 'role', 'tab')
    .and('have.attr', 'aria-selected', 'true');
  cy.get('.react-flow__node[data-id$="-transform"] [data-slot="canvas-node-shell"]')
    .first()
    .dblclick(40, 18);
  cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
}

export function activateMenu(slot: string): void {
  const selector = `[data-slot="context-menu-content"][data-state="open"] [data-slot="${slot}"]`;
  cy.get(selector).then(($item) => {
    const document = $item[0]!.ownerDocument;
    const event = new document.defaultView!.MouseEvent('pointerdown', {
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    $item[0]!.dispatchEvent(event);
    expect(event.defaultPrevented, 'viewport must not cancel a portalled menu activation').to.equal(
      false
    );
    expect(
      document.querySelector('[data-panning="true"]'),
      'viewport must not capture menu activation'
    ).to.equal(null);
  });
  cy.get(selector).click();
  cy.get('[data-slot="context-menu-content"][data-state="open"]').should('not.exist');
}

export function addWrapper(id: string): void {
  workbenchOperation(id).click();
  cy.get(
    '[role="dialog"] ' + form + ', [role="dialog"][data-slot="canvas-relational-operator-form"]'
  )
    .find('button[type="submit"]')
    .click();
}
