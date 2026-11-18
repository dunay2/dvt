/**
 * Owned concern: prove Templates selection, validation and read-only preview presentation.
 * Why: shared controls and responsive layout must retain the real route transitions.
 * Corner: token checks cannot hide blocked output, clipped names or overflow after reflow.
 */
import { stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubTemplatesRouteBootstrapApis(): void {
  stubShellBootstrapApis();
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '1.0.0',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
      monitoring: { available: true },
      cost: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
}

function resolvedToken(window: Window, property: string, token: string): string {
  const probe = window.document.createElement('span');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;display:block';
  probe.style.setProperty(property, `var(${token})`);
  window.document.body.append(probe);
  try {
    return window.getComputedStyle(probe).getPropertyValue(property);
  } finally {
    probe.remove();
  }
}

function assertCompactTemplatesPresentation(): void {
  cy.get<HTMLInputElement>('input[name="taskName"]').should(($input) => {
    const input = $input[0]!;
    const window = input.ownerDocument.defaultView!;
    const style = window.getComputedStyle(input);
    expect(style.fontSize).to.equal(resolvedToken(window, 'font-size', '--text-ui'));
    expect(style.height).to.equal(resolvedToken(window, 'height', '--shell-control-height'));
    const error = window.document.getElementById(`${input.id}-error`)!;
    expect(window.getComputedStyle(error).color).to.equal(style.borderColor);
    expect(window.getComputedStyle(error).color).to.equal(
      resolvedToken(window, 'color', '--status-danger')
    );

    const catalog = window.document.querySelector('[data-slot="templates-catalog"]')!;
    const selected = catalog.querySelector('[aria-pressed="true"]')!;
    expect(window.getComputedStyle(selected).backgroundColor).to.equal(
      resolvedToken(window, 'background-color', '--surface-selected')
    );
    const spacing = Number.parseFloat(resolvedToken(window, 'width', '--spacing'));
    const previewIcon = window.document.querySelector(
      '[data-slot="templates-preview-panel"] h2 svg'
    )!;
    expect(previewIcon.getBoundingClientRect().width).to.equal(spacing * 4);
    const lastProfile = Array.from(catalog.querySelectorAll('button')).at(-1)!;
    expect(
      catalog.getBoundingClientRect().bottom - lastProfile.getBoundingClientRect().bottom
    ).to.be.at.most(spacing * 4);
    const schedule = window.document.querySelector('input[name="schedule"]')!;
    const helper = schedule.previousElementSibling!;
    expect(
      schedule.getBoundingClientRect().top - helper.getBoundingClientRect().bottom
    ).to.be.at.most(spacing * 2);
  });
}

describe('Templates workbench', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
  });

  it('is reachable from shell navigation and announces the active template', () => {
    // Destinations stay directly discoverable; opening Templates must not require a brand menu.
    stubTemplatesRouteBootstrapApis();
    visitWithE2eWorkspaceSession('/plugins');

    cy.get('[data-slot="app-route-error-boundary"]').should('not.exist');
    cy.get('[data-slot="shell-app-menu-trigger"]').should('not.exist');
    cy.get('[data-slot="left-navigation-link"][href="/templates"]').should('be.visible').focus();
    cy.press(Cypress.Keyboard.Keys.ENTER);

    cy.location('pathname').should('eq', '/templates');
    cy.get('[data-slot="left-navigation-link"][href="/templates"]').should(
      'have.attr',
      'aria-current',
      'page'
    );
    cy.get('[data-slot="route-workbench-header"]').contains('Templates').should('be.visible');
    cy.contains('button[aria-pressed="true"]', 'Snowflake Task').should('be.visible');
    cy.get('input[name="taskName"]')
      .should('have.attr', 'aria-invalid', 'true')
      .and(
        'have.attr',
        'aria-describedby',
        'template-parameter-taskName-help template-parameter-taskName-error'
      );
    cy.get('#template-parameter-taskName-error').should('contain', 'Task name is required.');
    assertCompactTemplatesPresentation();
  });

  it('blocks missing parameters and then renders generated source preview', () => {
    stubTemplatesRouteBootstrapApis();
    visitWithE2eWorkspaceSession('/templates');

    cy.get('[data-slot="app-route-error-boundary"]').should('not.exist');
    cy.get('[data-slot="route-workbench-frame"]').should('be.visible');
    cy.get('[data-slot="route-workbench-header"]').contains('Templates').should('be.visible');
    cy.contains('button', 'Snowflake Task').should('be.visible');
    cy.contains('Preview blocked').should('be.visible');
    cy.contains('Task name is required.').should('be.visible');
    cy.contains('Warehouse is required.').should('be.visible');
    cy.get('[data-slot="templates-generated-source-preview"]').should('not.exist');

    cy.get('input[name="taskName"]').clear().type('load_orders');
    cy.get('input[name="warehouse"]').clear().type('transforming_wh');
    cy.get('textarea[name="sqlBody"]').clear().type('call analytics.load_orders();');

    cy.contains('Preview ready').should('be.visible');
    cy.contains('load_orders.task.sql').should('be.visible');
    cy.get('[data-slot="templates-generated-source-preview"]').should('be.visible');
    cy.get('[data-testid="monaco-code-viewer"]').should('be.visible');
    cy.get('[data-slot="templates-generated-source-readable-preview"]')
      .should('contain', 'create or replace task load_orders')
      .and('contain', 'warehouse = transforming_wh')
      .and('contain', 'call analytics.load_orders()')
      .and('contain', '\n;');

    const longName = 'load_orders_with_a_long_governed_identifier_'.repeat(3);
    cy.get('input[name="taskName"]').clear().type(longName);
    cy.contains(`${longName}.task.sql`).should('be.visible');
    cy.viewport(768, 900);
    cy.get('[data-slot="templates-workbench"]').should(($workbench) => {
      const workbench = $workbench[0]!;
      const bounds = workbench.getBoundingClientRect();
      expect(workbench.scrollWidth).to.be.at.most(workbench.clientWidth);
      const regions = [
        'templates-catalog',
        'templates-parameter-form',
        'templates-preview-panel',
      ].map((slot) => workbench.querySelector(`[data-slot="${slot}"]`)!.getBoundingClientRect());
      for (const region of regions) {
        expect(Math.floor(region.left)).to.be.at.least(Math.floor(bounds.left));
        expect(Math.ceil(region.right)).to.be.at.most(Math.ceil(bounds.right));
      }
      expect(regions[0]!.bottom).to.be.at.most(regions[1]!.top);
      expect(regions[1]!.bottom).to.be.at.most(regions[2]!.top);
    });
  });
});
