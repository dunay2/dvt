/** Owned concern: verify Canvas workbench tab placement and text-only visual posture in browser. */
import { resolveCanvasViewCopy, type CanvasViewCopy } from '../../../src/app/views/canvas/copy';
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const WORKBENCH_TAB_LABEL_KEYS = [
  'workbenchGraphTabLabel',
  'workbenchCodeTabLabel',
  'workbenchLineageTabLabel',
  'workbenchDiffTabLabel',
  'workbenchArtifactsTabLabel',
  'workbenchRunsTabLabel',
] as const satisfies readonly (keyof CanvasViewCopy)[];
const GLOBAL_REMOVED_WORKBENCH_HREFS = ['/code', '/lineage', '/diff', '/artifacts'] as const;
const RETIRED_SHELL_WORKBENCH_LABELS = ['Code', 'Lineage', 'Diff', 'Artifacts'] as const;
type WorkbenchTabLabelKey = (typeof WORKBENCH_TAB_LABEL_KEYS)[number];

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
  stubE2eJsonApi('GET', '/workspace/context', {
    effectiveWorkspace: E2E_WORKSPACE_SESSION,
    availableWorkspaces: [E2E_WORKSPACE_SESSION],
  });
  stubCanvasDraftRead();

  visitWithE2eWorkspaceSession(path);
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function assertGlobalWorkbenchRoutesAreAbsent(): void {
  for (const href of GLOBAL_REMOVED_WORKBENCH_HREFS) {
    cy.get('[data-slot="left-navigation-rail"]').find(`a[href="${href}"]`).should('not.exist');
  }

  cy.get('[data-slot="left-navigation-rail"]').within(() => {
    for (const label of RETIRED_SHELL_WORKBENCH_LABELS) {
      cy.contains('[data-slot="left-navigation-caption"]', new RegExp(`^${label}$`)).should(
        'not.exist'
      );
    }
  });
}

function assertCanvasWorkbenchTabsAreVisible(): void {
  cy.get('body').then(($body) => {
    expect($body.find('#app-loading-screen:visible')).to.have.length(0);
  });

  cy.window({ log: false }).then((window) => {
    const copy = resolveCanvasViewCopy(
      window.navigator.language || window.document.documentElement.lang
    );

    cy.get('[data-slot="canvas-workbench-tab-strip"]').within(() => {
      for (const labelKey of WORKBENCH_TAB_LABEL_KEYS) {
        cy.contains('button', copy[labelKey]).should('be.visible');
      }
    });
  });
}

function clickCanvasWorkbenchTab(labelKey: WorkbenchTabLabelKey): void {
  cy.window({ log: false }).then((window) => {
    const copy = resolveCanvasViewCopy(
      window.navigator.language || window.document.documentElement.lang
    );

    cy.get('[data-slot="canvas-workbench-tab-strip"]').contains('button', copy[labelKey]).click();
  });
}

function assertCanvasWorkbenchTabsAreTextOnly(): void {
  cy.get('[data-slot="canvas-workbench-tab-strip"]').then(($strip) => {
    const tabTriggers = Array.from(
      $strip[0].querySelectorAll<HTMLElement>('[data-slot="canvas-workbench-tab-trigger"]')
    );

    for (const tab of tabTriggers) {
      expect(tab.querySelector('svg'), tab.textContent ?? 'tab').to.equal(null);
      expect(tab.querySelectorAll('span'), tab.textContent ?? 'tab').to.have.length(1);
    }
  });
}

function assertShellWorkspaceContextIsRelocated(): void {
  cy.get('[data-slot="shell-top-bar"]').within(() => {
    cy.get('[data-slot="shell-project-identity-badge"]').should('be.visible');
    cy.get('[data-slot="shell-project-identity-env"]').invoke('text').should('not.be.empty');
    cy.get('[data-slot="shell-workspace-context-trigger"]').should('be.visible');
    cy.get('[data-slot="shell-workspace-selectors"]').should('not.exist');
    cy.get('[role="combobox"]').should('not.exist');
  });

  cy.get('[data-slot="shell-workspace-context-trigger"]').click();
  cy.get('[data-slot="shell-workspace-context-menu"]').within(() => {
    cy.get('[data-slot="shell-workspace-context-details"]').should('be.visible');
    cy.get('[data-slot="shell-workspace-tenant-context"]').should('be.visible');
    cy.get('[aria-label="Tenant scope (read only)"]').should('be.visible');
    cy.get('[aria-label="Project scope (read only)"]').should('be.visible');
    cy.get('[aria-label="Environment scope (read only)"]').should('be.visible');
    cy.get('[role="combobox"]').should('not.exist');
    cy.contains('Tenant').should('be.visible');
    cy.contains('Project').should('be.visible');
    cy.contains('Environment').should('be.visible');
  });
  cy.get('body').type('{esc}');
}

function assertCanvasWorkbenchTabsAreHeaderScoped(): void {
  cy.get('[data-slot="left-navigation-rail"]').then(($rail) => {
    const railRect = $rail[0].getBoundingClientRect();

    cy.get('[data-slot="shell-top-bar"]').then(($topBar) => {
      const topBarRect = $topBar[0].getBoundingClientRect();

      cy.get('[data-slot="canvas-workbench-tab-strip"]').then(($strip) => {
        const strip = $strip[0];
        const stripRect = strip.getBoundingClientRect();
        const tabRects = Array.from(
          strip.querySelectorAll<HTMLElement>('[data-slot="canvas-workbench-tab-trigger"]')
        );

        expect(strip.closest('[data-slot="left-navigation-rail"]')).to.equal(null);
        expect(strip.closest('[data-slot="app-shell-outlet"]')).not.to.equal(null);
        expect(stripRect.left).to.be.greaterThan(railRect.right - 1);
        expect(stripRect.top).to.be.greaterThan(topBarRect.bottom - 1);
        expect(stripRect.width).to.be.greaterThan(500);
        expect(stripRect.height).to.be.lessThan(80);
        expect(
          new Set(tabRects.map((tab) => Math.round(tab.getBoundingClientRect().top))).size
        ).to.equal(1);
        expect(tabRects.at(-1)?.getBoundingClientRect().left ?? 0).to.be.greaterThan(
          tabRects[0]?.getBoundingClientRect().left ?? 0
        );

        for (const tab of tabRects) {
          const label = tab.querySelector<HTMLElement>('span');
          expect(tab.scrollWidth, tab.textContent ?? 'tab').to.be.lessThan(tab.clientWidth + 2);
          expect(label?.scrollWidth ?? 0, tab.textContent ?? 'tab').to.be.lessThan(
            (label?.clientWidth ?? 0) + 2
          );
        }
      });
    });
  });
}

describe('Canvas workbench tabs', () => {
  for (const viewport of [
    { width: 1400, height: 900 },
    { width: 820, height: 768 },
    { width: 700, height: 768 },
  ] as const) {
    it(`keeps workbench tabs scoped, readable, and startup-ready at ${viewport.width}px`, () => {
      cy.viewport(viewport.width, viewport.height);

      visitCanvasWorkbench();

      assertGlobalWorkbenchRoutesAreAbsent();
      assertShellWorkspaceContextIsRelocated();
      assertCanvasWorkbenchTabsAreVisible();
      assertCanvasWorkbenchTabsAreTextOnly();
      assertCanvasWorkbenchTabsAreHeaderScoped();
      cy.get('.react-flow').should('be.visible');

      clickCanvasWorkbenchTab('workbenchLineageTabLabel');
      cy.location('pathname').should('eq', '/canvas/lineage');
      cy.contains('Column-level').should('be.visible');

      clickCanvasWorkbenchTab('workbenchGraphTabLabel');
      cy.location('pathname').should('eq', '/canvas');
      cy.get('.react-flow').should('be.visible');
    });
  }

  it('keeps workbench tabs scoped to Canvas instead of publishing global shell routes', () => {
    cy.viewport(1400, 900);

    visitCanvasWorkbench();

    assertGlobalWorkbenchRoutesAreAbsent();
    assertShellWorkspaceContextIsRelocated();
    assertCanvasWorkbenchTabsAreVisible();
    assertCanvasWorkbenchTabsAreTextOnly();
    assertCanvasWorkbenchTabsAreHeaderScoped();
    cy.get('.react-flow').should('be.visible');

    clickCanvasWorkbenchTab('workbenchLineageTabLabel');
    cy.location('pathname').should('eq', '/canvas/lineage');
    cy.contains('Column-level').should('be.visible');

    clickCanvasWorkbenchTab('workbenchGraphTabLabel');
    cy.location('pathname').should('eq', '/canvas');
    cy.get('.react-flow').should('be.visible');
  });
});
