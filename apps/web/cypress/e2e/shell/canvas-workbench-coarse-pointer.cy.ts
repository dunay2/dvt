/**
 * Owned concern: prove that touch users can leave Focus without hover.
 * @decision Own touch emulation in a separate spec target because its reset changes desktop input.
 * @consequence Cleanup runs after failures; the next spec receives a fresh desktop target.
 */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas Focus with coarse pointer input', () => {
  beforeEach(() => {
    stubShellBootstrapApis({
      capabilities: {
        body: {
          apiVersion: '1.0.0',
          minFrontendVersion: '0.0.1',
          plugins: { dvt: { available: true } },
        },
      },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubCanvasDraftRead({ readOnly: true });
  });

  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setTouchEmulationEnabled',
        params: { enabled: false },
      })
    );
  });

  it('retains visible Focus controls for a coarse pointer without hover', () => {
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.window().should((window) => {
      expect(
        window.matchMedia('(hover: hover) and (pointer: fine)').matches,
        'fresh target desktop input profile'
      ).to.equal(true);
    });
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setTouchEmulationEnabled',
        params: { enabled: true, maxTouchPoints: 1 },
      })
    );
    cy.window().should((window) => {
      expect(
        window.matchMedia('(hover: none) and (pointer: coarse)').matches,
        'touch input profile'
      ).to.equal(true);
    });
    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.contains('[role="menuitemcheckbox"]', /Focus Mode|Modo foco/).click();
    cy.get('[data-slot="app-shell-outlet"]').click('bottomRight');
    cy.get('[data-slot="app-shell-header-host"]').should('have.attr', 'data-focus-mode', 'true');
    cy.get('[data-slot="shell-top-bar"]').should(($header) => {
      expect($header[0]!.getBoundingClientRect().top).to.equal(0);
    });
    cy.get('[data-slot="shell-menu-trigger"]').should('be.visible').click();
    cy.contains('[role="menuitemcheckbox"]', /Focus Mode|Modo foco/).click();
    cy.get('[data-slot="app-shell-left-navigation"]').should('be.visible');
  });
});
