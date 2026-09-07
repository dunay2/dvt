/**
 * Owned concern: prove active-session project creation and workspace isolation
 * through the real protected runtime without request stubs.
 */

type ProjectCreationWindow = Window & {
  __dvtProjectCreationPostCount?: number;
};

function liveProjectCreationEnabled(): boolean {
  const value = Cypress.env('liveProjectCreation');
  return value === true || value === 1 || value === '1';
}

function visitCanvasWithProjectCreationObservation(): void {
  cy.visit('/canvas', {
    onBeforeLoad(window) {
      const observedWindow = window as ProjectCreationWindow;
      const originalFetch = window.fetch.bind(window);
      observedWindow.__dvtProjectCreationPostCount = 0;
      window.fetch = (input, init) => {
        const request = new window.Request(input, init);
        const requestUrl = new URL(request.url);
        if (request.method.toUpperCase() === 'POST' && requestUrl.pathname === '/projects') {
          observedWindow.__dvtProjectCreationPostCount =
            (observedWindow.__dvtProjectCreationPostCount ?? 0) + 1;
        }
        return originalFetch(input, init);
      };
    },
  });
}

describe('Active project creation live vertical', () => {
  before(function () {
    if (!liveProjectCreationEnabled()) {
      this.skip();
    }
  });

  it('creates B from A, proves B is empty, switches A → B, and survives reload', () => {
    cy.viewport(1366, 768);
    const projectName = `PTH1 live ${Date.now()}`;

    visitCanvasWithProjectCreationObservation();

    cy.get('[data-slot="shell-workspace-menu-trigger"]', { timeout: 30_000 })
      .should('be.visible')
      .invoke('text')
      .then((initialProjectTriggerText) => {
        cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
        cy.get('[data-slot="shell-new-project-command"]')
          .should('be.visible')
          .should(($command) => {
            expect($command.text()).to.match(/New project|Nuevo proyecto/);
          })
          .click();

        cy.get('[data-slot="project-creation-dialog"]')
          .should('be.visible')
          .within(() => {
            cy.get('select[name="tenantId"]').should('not.exist');
            cy.get('input[name="projectName"]')
              .should('have.focus')
              .type(projectName)
              .should('have.value', projectName);
            cy.contains('button', /Create project|Crear proyecto/).click();
          });

        cy.get('[data-slot="project-creation-dialog"]', { timeout: 30_000 }).should('not.exist');
        cy.window().its('__dvtProjectCreationPostCount').should('eq', 1);
        cy.get('[data-slot="shell-workspace-menu-trigger"]')
          .should('contain.text', projectName)
          .and('not.contain.text', initialProjectTriggerText.trim());
        cy.get('[data-slot="canvas-playground-empty-state"] h2')
          .contains('Canvas', {
            timeout: 30_000,
          })
          .should('be.visible');
        cy.get('.react-flow__node').should('not.exist');

        cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
        cy.get('[data-slot="shell-workspace-scope-selector"] button[aria-pressed="false"]')
          .first()
          .click();
        cy.get('[data-slot="shell-workspace-menu-trigger"]')
          .should('contain.text', initialProjectTriggerText.replace(/^.*?:\s*/, '').trim())
          .and('not.contain.text', projectName);

        cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
        cy.get('[data-slot="shell-workspace-scope-selector"] button').contains(projectName).click();
        cy.get('[data-slot="shell-workspace-menu-trigger"]').should('contain.text', projectName);
        cy.reload();
        cy.get('[data-slot="shell-workspace-menu-trigger"]', { timeout: 30_000 }).should(
          'contain.text',
          projectName
        );
        cy.get('[data-slot="canvas-playground-empty-state"] h2')
          .contains('Canvas')
          .should('be.visible');
      });
  });
});
