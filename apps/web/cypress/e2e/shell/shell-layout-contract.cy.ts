function stubShellApis(): void {
  cy.intercept('GET', '**/healthz', {
    statusCode: 200,
    body: {
      ok: true,
      status: 'healthy',
      components: {
        intentReconciler: {
          status: 'healthy',
        },
      },
    },
  }).as('healthz');

  cy.intercept('GET', '**/readyz', {
    statusCode: 200,
    body: {
      ok: true,
      status: 'ready',
    },
  }).as('readyz');

  cy.intercept('GET', '**/version', {
    statusCode: 200,
    body: {
      name: 'dvt-api',
      version: '1.0.0',
    },
  }).as('version');

  cy.intercept('GET', '**/db/ready', {
    statusCode: 200,
    body: {
      ok: true,
      reason: null,
    },
  }).as('dbReady');

  cy.intercept('GET', '**/capabilities*', {
    statusCode: 200,
    body: {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: {},
    },
  }).as('capabilities');
}

function visitPluginsWithUiLayout(partialState?: Record<string, unknown>): void {
  cy.visit('/plugins', {
    onBeforeLoad(window) {
      window.localStorage.clear();
      if (partialState) {
        window.localStorage.setItem(
          'dvt-web-ui-layout',
          JSON.stringify({
            state: {
              leftNavCollapsed: false,
              explorerPanelWidth: 280,
              explorerPanelVisible: false,
              inspectorPanelWidth: 380,
              inspectorPanelVisible: false,
              consolePanelHeight: 0,
              consolePanelVisible: false,
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

  cy.wait('@healthz');
  cy.wait('@readyz');
  cy.wait('@version');
  cy.wait('@dbReady');
  cy.wait('@capabilities');
}

describe('Shell layout contract', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    stubShellApis();
  });

  it('keeps the footer navigation pinned to the bottom of the full-height rail', () => {
    visitPluginsWithUiLayout();

    cy.get('[data-slot="app-shell-outlet"]')
      .contains(/^Plugins$/)
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
    visitPluginsWithUiLayout({ focusMode: true });

    cy.get('[data-slot="app-shell-left-navigation"]').should('not.exist');
    cy.get('[data-slot="left-navigation-rail"]').should('not.exist');
    cy.get('[data-slot="app-shell-main"]').should('exist');
    cy.get('[data-slot="app-shell-outlet"]').should('exist');
    cy.get('[data-slot="app-shell-outlet"]')
      .contains(/^Plugins$/)
      .should('be.visible');
  });
});
