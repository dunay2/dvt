import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
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
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
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

  it('expands and shrinks Semantics without losing the selected expression or saving a draft', () => {
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', substraitInnerJoin: true });
    visitShellRouteWithUiLayout('/canvas', { bottomDrawerVisible: false });
    cy.get(
      '.react-flow__node[data-id="join-transform"] [data-slot="graph-node-card-title"]'
    ).click();
    cy.contains('[data-slot="semantic-workbench-relation-node"]', 'JOIN').click();
    const expressionToggle = '[data-slot="semantic-workbench-expand-expression"]';
    cy.get(expressionToggle).click().should('have.attr', 'aria-pressed', 'true');

    const handle = '#app-shell-bottom-drawer-resize-handle';
    const drawer = '#app-shell-bottom-drawer-panel';
    const dragDrawerTo = (percentage: number): void => {
      cy.window().then((window) => {
        const element = window.document.querySelector<HTMLElement>(handle)!;
        const bounds = element.getBoundingClientRect();
        const group = element.parentElement!.getBoundingClientRect();
        const clientX = bounds.left + bounds.width / 2;
        const targetY = group.top + group.height * (1 - percentage / 100);
        const dispatchPointer = (
          target: EventTarget,
          type: string,
          clientY: number,
          buttons: number
        ): void => {
          target.dispatchEvent(
            new window.PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              pointerType: 'mouse',
              isPrimary: true,
              clientX,
              clientY,
              button: 0,
              buttons,
            })
          );
        };
        dispatchPointer(element, 'pointerdown', bounds.top + bounds.height / 2, 1);
        cy.get(handle).should('have.attr', 'data-resize-handle-state', 'drag');
        cy.then(() => dispatchPointer(window.document.body, 'pointermove', targetY, 1));
        cy.get(drawer).should(($drawer) => {
          expect(Number($drawer.attr('data-panel-size'))).to.be.closeTo(
            Math.min(90, percentage),
            1
          );
        });
        cy.then(() => dispatchPointer(window, 'pointerup', targetY, 0));
      });
    };

    cy.get('[data-slot="semantic-transform-focus"]').then(($semantic) => {
      const semanticElement = $semantic[0];
      const expressionText = $semantic.find('.react-flow__nodes').text();
      const saveCount = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      dragDrawerTo(95);
      cy.get(drawer).should('have.attr', 'data-panel-size', '90.0');
      cy.get(handle).find('svg').should('be.visible');
      cy.get(expressionToggle).should('have.attr', 'aria-pressed', 'true');
      dragDrawerTo(35);
      cy.get(drawer).should(($drawer) => {
        expect(Number($drawer.attr('data-panel-size'))).to.be.closeTo(35, 1);
      });

      cy.get(handle).focus().trigger('keydown', { key: 'Home' });
      cy.get(drawer).should('have.attr', 'data-panel-size', '90.0');
      cy.get(handle).trigger('keydown', { key: 'End' });
      cy.get(drawer).should('have.attr', 'data-panel-size', '12.0');
      cy.get('[data-slot="semantic-transform-focus"]').should(($current) => {
        expect($current[0]).to.equal(semanticElement);
        expect($current.find('.react-flow__nodes').text()).to.equal(expressionText);
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.equal(saveCount);
      });
      cy.get(expressionToggle).should('have.attr', 'aria-pressed', 'true');
      cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]').should(
        'have.attr',
        'aria-selected',
        'true'
      );
    });
  });
});
