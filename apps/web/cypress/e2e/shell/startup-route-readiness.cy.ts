/** Owned concern: verify protected route startup waits for runtime capability and context readiness in browser. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { stubE2eApi, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Startup route readiness', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    stubShellBootstrapApis();
  });

  it('settles the startup gate for the public login route', () => {
    cy.visit('/login?returnTo=%2F');

    cy.contains('Login required').should('be.visible');
    cy.get('#app-loading-screen').should('have.attr', 'data-state', 'complete');
    cy.get('#app-loading-screen').should('not.be.visible');
  });

  it('serves the Raven browser icons with their declared formats', () => {
    cy.visit('/login?returnTo=%2F');

    cy.document().then((document) => {
      expect(
        Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')).map(
          ({ type, href }) => ({ type, path: new URL(href).pathname })
        )
      ).to.deep.equal([
        { type: 'image/x-icon', path: '/favicon/favicon.ico' },
        { type: 'image/svg+xml', path: '/favicon/raven-icon.svg' },
        { type: 'image/png', path: '/favicon/raven-icon.png' },
      ]);
      expect(
        document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.href
      ).to.include('/favicon/raven-maskable-192.png');
      expect(document.querySelector<HTMLImageElement>('#app-loading-logo')?.src).to.include(
        '/favicon/raven-icon.svg'
      );
      expect(document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href).to.include(
        '/favicon/site.webmanifest'
      );
    });

    cy.request<string>({ url: '/favicon/favicon.ico', encoding: 'binary' }).then((response) => {
      expect(response.headers['content-type']).to.include('image/x-icon');
      expect(Array.from(response.body.slice(0, 4), (value) => value.charCodeAt(0))).to.deep.equal([
        0, 0, 1, 0,
      ]);
    });
    cy.request<string>({ url: '/favicon/raven-icon.png', encoding: 'binary' }).then((response) => {
      expect(response.headers['content-type']).to.include('image/png');
      expect(Array.from(response.body.slice(0, 4), (value) => value.charCodeAt(0))).to.deep.equal([
        0x89, 0x50, 0x4e, 0x47,
      ]);
    });
    cy.request<string>({ url: '/favicon/raven-icon.svg', encoding: 'binary' }).then((response) => {
      expect(response.headers['content-type']).to.include('image/svg+xml');
      expect(response.body.length).to.be.lessThan(10_000);
    });
    cy.request('/favicon/site.webmanifest')
      .its('body.icons')
      .should('deep.equal', [
        {
          src: '/favicon/raven-icon.png',
          sizes: '1254x1254',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/favicon/raven-maskable-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/favicon/raven-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ]);
  });

  it('keeps the fifth startup check pending until capabilities settle', () => {
    let releaseCapabilities: () => void = () => undefined;
    stubE2eApi(
      'GET',
      '/capabilities',
      () =>
        new Promise((resolve) => {
          releaseCapabilities = () => {
            resolve({
              body: {
                apiVersion: '1.0.0',
                minFrontendVersion: '0.0.1',
                plugins: {
                  dvt: { available: true },
                },
              },
            });
          };
        })
    );
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubCanvasDraftRead();

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('#app-loading-screen').should('be.visible');
    cy.get('#app-loading-screen').should('not.have.attr', 'data-state', 'complete');
    cy.contains('Preparing initial route').should('be.visible');
    cy.contains(/2\/5 startup checks settled|2\/5 comprobaciones de arranque resueltas/).should(
      'be.visible'
    );
    cy.contains(/5\/5 startup checks settled|5\/5 comprobaciones de arranque resueltas/).should(
      'not.exist'
    );

    waitForE2eApiCall('/capabilities', 'GET');
    cy.then(() => {
      releaseCapabilities();
    });

    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.contains('Sales canvas').should('be.visible');
    cy.get('#app-loading-screen').should('have.attr', 'data-state', 'complete');
    cy.get('#app-loading-screen').should('not.be.visible');
  });

  it('keeps startup usable while recording a privacy-safe capabilities failure', () => {
    const operabilityEvents: unknown[] = [];
    stubE2eApi('GET', '/capabilities', () => ({
      statusCode: 503,
      body: { error: 'private upstream detail' },
    }));
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubCanvasDraftRead();

    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.console.warn = (marker: unknown, event: unknown) => {
          if (marker === '[frontend-operability]') {
            operabilityEvents.push(event);
          }
        };
      },
    });

    cy.contains('Sales canvas').should('be.visible');
    cy.get('#app-loading-screen').should('have.attr', 'data-state', 'complete');
    cy.wrap(operabilityEvents).should('deep.equal', [
      {
        type: 'frontend.bootstrap.failed',
        phase: 'capabilities',
        reasonCode: 'capabilities-query-failed',
      },
    ]);
  });
});
