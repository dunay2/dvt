import { stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubShellApis(): void {
  stubShellBootstrapApis({
    scopes: [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'plan:preview',
      'run:start',
    ],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_WORKSPACE_SESSION,
    availableWorkspaces: [E2E_WORKSPACE_SESSION],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      cost: { available: true },
      dbt: { available: true },
      dvt: { available: true },
      monitoring: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/cost/attribution-summary', {
    tenantId: E2E_WORKSPACE_SESSION.tenantId,
    projectId: E2E_WORKSPACE_SESSION.projectId,
    environmentId: E2E_WORKSPACE_SESSION.environmentId,
    runCount: 0,
    completedStepCount: 0,
    failedStepCount: 0,
    totalStepDurationMs: 0,
    totalCostAmount: null,
    currency: null,
    costCaptureStatus: 'unavailable',
    observedWindow: {
      firstEventAt: null,
      lastEventAt: null,
    },
    runs: [],
    steps: [],
    nextCursor: null,
  });
}

function visitShellRouteWithUiLayout(path: string, partialState?: Record<string, unknown>): void {
  visitWithE2eWorkspaceSession(path, {
    onBeforeLoad(window) {
      if (partialState) {
        window.localStorage.setItem(
          'dvt-web-ui-layout',
          JSON.stringify({
            state: {
              leftNavCollapsed: false,
              inspectorPanelWidth: 380,
              inspectorPanelVisible: false,
              bottomDrawerHeight: 0,
              bottomDrawerVisible: false,
              focusMode: false,
              gridSize: 20,
              ...partialState,
            },
            version: 0,
          })
        );
      }
    },
  });

  cy.get('[data-slot="app-shell-outlet"]').should('exist');
}

describe('Shell layout contract', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    stubShellApis();
  });

  it('keeps the footer navigation pinned to the bottom of the full-height rail', () => {
    visitShellRouteWithUiLayout('/cost');

    cy.get('[data-slot="app-shell-outlet"]')
      .contains(/^Cost$/)
      .should('be.visible');

    cy.window().then((window) => {
      const body = window.document.querySelector('[data-slot="app-shell-body"]');
      const wrapper = window.document.querySelector('[data-slot="app-shell-left-navigation"]');
      const rail = window.document.querySelector('[data-slot="left-navigation-rail"]');
      const nav = window.document.querySelector('[data-slot="left-navigation-nav"]');
      const links = Array.from(
        window.document.querySelectorAll<HTMLAnchorElement>('[data-slot="left-navigation-link"]')
      );

      expect(body, 'shell body').to.not.equal(null);
      expect(wrapper, 'rail wrapper').to.not.equal(null);
      expect(rail, 'left navigation rail').to.not.equal(null);
      expect(nav, 'left navigation nav').to.not.equal(null);
      expect(links.length, 'navigation link count').to.be.greaterThan(2);

      const bodyRect = body!.getBoundingClientRect();
      const wrapperRect = wrapper!.getBoundingClientRect();
      const railRect = rail!.getBoundingClientRect();
      const navRect = nav!.getBoundingClientRect();
      const lastFooterLinkRect = links.at(-1)!.getBoundingClientRect();

      expect(
        Math.abs(wrapperRect.height - bodyRect.height),
        'wrapper stretches to body height'
      ).to.be.lessThan(2);
      expect(
        Math.abs(railRect.height - wrapperRect.height),
        'rail stretches to wrapper height'
      ).to.be.lessThan(2);
      expect(
        navRect.bottom - lastFooterLinkRect.bottom,
        'footer link stays pinned near nav bottom'
      ).to.be.lessThan(24);
    });
  });

  it('hides the left navigation rail in focus mode while keeping the main shell route visible', () => {
    visitShellRouteWithUiLayout('/plugins', { focusMode: true });

    cy.get('[data-slot="app-shell-left-navigation"]').should('not.exist');
    cy.get('[data-slot="left-navigation-rail"]').should('not.exist');
    cy.get('[data-slot="app-shell-main"]').should('exist');
    cy.get('[data-slot="app-shell-outlet"]').should('exist');
    cy.get('[data-slot="app-shell-outlet"]')
      .contains(/^Plugins$/)
      .should('be.visible');
  });
});
