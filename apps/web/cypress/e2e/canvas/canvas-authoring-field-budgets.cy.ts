/** Owned concern: prove Canvas authoring field budgets in a visible browser. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type CanvasDraftSaveRequestBody = {
  draft: {
    nodes: Array<{
      id: string;
      name: string;
      metadata?: { config?: { alias?: string; schema?: string } };
    }>;
  };
};

function stubRuntimeCapabilities(): void {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save', 'run:start'],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/warehouse/connections', []);
}

function visitReadyCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

describe('Canvas authoring field budgets', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
  });

  it('retains an oversized name, blocks persistence, and saves the corrected value', () => {
    stubStatefulCanvasDraftAuthoring({
      authoringGenerated: true,
      title: 'Bounded authoring fields',
    });

    visitReadyCanvas();

    cy.get(
      '.react-flow__node[data-id="dvt-transform-1"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();

    const composed = 'Órdenes 😀';
    cy.get('input[name="node-name"]')
      .then(($input) => {
        const input = $input[0] as HTMLInputElement;
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        valueSetter?.call(input, composed);
        input.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            data: composed,
            inputType: 'insertCompositionText',
            isComposing: true,
          })
        );
        input.dispatchEvent(
          new CompositionEvent('compositionend', { bubbles: true, data: composed })
        );
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: composed }));
      })
      .should('have.value', composed)
      .and('not.have.attr', 'aria-invalid');

    const oversized = 'x'.repeat(257);
    cy.get('input[name="node-name"]')
      .then(($input) => {
        const input = $input[0] as HTMLInputElement;
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(input, oversized);
        input.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            data: oversized,
            inputType: 'insertFromPaste',
          })
        );
      })
      .should('have.value', oversized)
      .and('have.attr', 'aria-invalid', 'true');
    cy.contains('Node name is too long.').should('be.visible');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).should(
      'be.disabled'
    );
    cy.wrap(null).should(() => {
      const persistedOversizedName = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .some((body) =>
          body.draft.nodes.some(
            (candidate) => candidate.id === 'dvt-transform-1' && candidate.name === oversized
          )
        );
      expect(persistedOversizedName, 'oversized name was not persisted').to.equal(false);
    });

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-language-option-es"]').click();
    cy.get('html').should('have.attr', 'lang', 'es');
    cy.get('input[name="node-name"]').should('have.value', oversized);
    cy.contains('El nombre del nodo es demasiado largo.').should('be.visible');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Aplicar$/).should(
      'be.disabled'
    );

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-language-option-en"]').click();
    cy.get('html').should('have.attr', 'lang', 'en');

    cy.get('input[name="node-name"]').clear().type('Orders 2026');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
    cy.wrap(null).should(() => {
      const savedNode = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((candidate) => candidate.id === 'dvt-transform-1'))
        .find((node) => node?.name === 'Orders 2026');
      expect(savedNode, 'saved corrected name').to.not.be.undefined;
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitReadyCanvas();
    cy.get(
      '.react-flow__node[data-id="dvt-transform-1"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
    cy.get('input[name="node-name"]').should('have.value', 'Orders 2026');
    cy.get('[data-slot=canvas-node-workbench-close]').click();

    cy.get('.react-flow__node[data-id=source-1] [data-slot=canvas-node-shell]').dblclick();
    cy.get('input[name=dvt-source-alias]')
      .clear()
      .type(' orders_source ')
      .should('have.value', ' orders_source ')
      .and('have.attr', 'aria-invalid', 'true');
    cy.contains('PostgreSQL identifiers cannot start or end with whitespace.').should('be.visible');
    cy.contains('[data-slot=canvas-node-workbench-panel] button', /^Apply$/).should('be.disabled');
    cy.get('input[name=dvt-source-alias]').clear().type('orders_source_v2');
    cy.contains('[data-slot=canvas-node-workbench-panel] button', /^Apply$/).click();
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .some((body) =>
          body.draft.nodes.some(
            (node) => node.id === 'source-1' && node.metadata?.config?.alias === 'orders_source_v2'
          )
        );
      expect(saved, 'corrected Source alias persisted').to.equal(true);
    });
    cy.get('[data-slot=canvas-node-workbench-close]').click();

    cy.get('.react-flow__node[data-id=sink-1] [data-slot=canvas-node-shell]').dblclick();
    cy.get('[data-slot=canvas-node-workbench-tab-sink]').click();
    cy.get('input[name=dvt-sink-schema]')
      .clear()
      .type(' marts ')
      .should('have.value', ' marts ')
      .and('have.attr', 'aria-invalid', 'true');
    cy.contains('PostgreSQL identifiers cannot start or end with whitespace.').should('be.visible');
    cy.contains('[data-slot=canvas-node-workbench-panel] button', /^Apply$/).should('be.disabled');
    cy.get('input[name=dvt-sink-schema]').clear().type('marts_v2');
    cy.contains('[data-slot=canvas-node-workbench-panel] button', /^Apply$/).click();
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .some((body) =>
          body.draft.nodes.some(
            (node) => node.id === 'sink-1' && node.metadata?.config?.schema === 'marts_v2'
          )
        );
      expect(saved, 'corrected Sink schema persisted').to.equal(true);
    });
    cy.get('[data-slot=canvas-node-workbench-close]').click();

    visitReadyCanvas();
    cy.get('.react-flow__node[data-id=source-1] [data-slot=canvas-node-shell]').dblclick();
    cy.get('input[name=dvt-source-alias]').should('have.value', 'orders_source_v2');
    cy.get('[data-slot=canvas-node-workbench-close]').click();
    cy.get('.react-flow__node[data-id=sink-1] [data-slot=canvas-node-shell]').dblclick();
    cy.get('[data-slot=canvas-node-workbench-tab-sink]').click();
    cy.get('input[name=dvt-sink-schema]').should('have.value', 'marts_v2');
  });
});
