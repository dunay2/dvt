import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const WORKBENCH_TAB_LABELS = ['Graph', 'Code', 'Lineage', 'Diff', 'Artifacts', 'Runs'] as const;
const GLOBAL_REMOVED_WORKBENCH_HREFS = ['/code', '/lineage', '/diff', '/artifacts'] as const;

function stubRuntimeCapabilities(): void {
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
}

function visitCanvasWorkbench(path = '/canvas'): void {
  stubShellBootstrapApis();
  stubRuntimeCapabilities();
  stubCanvasDraftRead();

  visitWithE2eWorkspaceSession(path);
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function assertGlobalWorkbenchRoutesAreAbsent(): void {
  for (const href of GLOBAL_REMOVED_WORKBENCH_HREFS) {
    cy.get('[data-slot="left-navigation-rail"]').find(`a[href="${href}"]`).should('not.exist');
  }
}

function assertCanvasWorkbenchTabsAreVisible(): void {
  cy.get('[data-slot="canvas-workbench-tab-strip"]').within(() => {
    for (const label of WORKBENCH_TAB_LABELS) {
      cy.contains('button', label).should('be.visible');
    }
  });
}

describe('Canvas workbench tabs', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
  });

  it('keeps workbench tabs scoped to Canvas instead of publishing global shell routes', () => {
    visitCanvasWorkbench();

    assertGlobalWorkbenchRoutesAreAbsent();
    assertCanvasWorkbenchTabsAreVisible();
    cy.get('.react-flow').should('be.visible');

    cy.get('[data-slot="canvas-workbench-tab-strip"]').contains('button', 'Lineage').click();
    cy.location('pathname').should('eq', '/canvas/lineage');
    cy.contains('Column-level').should('be.visible');

    cy.get('[data-slot="canvas-workbench-tab-strip"]').contains('button', 'Graph').click();
    cy.location('pathname').should('eq', '/canvas');
    cy.get('.react-flow').should('be.visible');
  });
});
