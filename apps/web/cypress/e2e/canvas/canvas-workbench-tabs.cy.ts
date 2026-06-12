/** Owned concern: verify Canvas workbench tab placement and controlled-icon visual posture in browser. */
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
  'workbenchLogsTabLabel',
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
  cy.get('body').then(($body) => {
    for (const label of RETIRED_SHELL_WORKBENCH_LABELS) {
      expect(
        Array.from($body[0].querySelectorAll('[data-slot="left-navigation-caption"]')).map(
          (caption) => caption.textContent?.trim() ?? ''
        ),
        `retired shell caption ${label}`
      ).not.to.include(label);
    }

    for (const href of GLOBAL_REMOVED_WORKBENCH_HREFS) {
      expect($body.find(`a[href="${href}"]`), `retired shell href ${href}`).to.have.length(0);
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

    for (const labelKey of WORKBENCH_TAB_LABEL_KEYS) {
      cy.get('[data-slot="canvas-workbench-tab-strip"]')
        .contains('button', copy[labelKey])
        .scrollIntoView()
        .should('be.visible');
    }
    cy.get('[data-slot="canvas-workbench-chrome"]').scrollTo('left', {
      ensureScrollable: false,
    });
    cy.get('[data-slot="canvas-workbench-tab-strip"]').scrollTo('left', {
      ensureScrollable: false,
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
      expect(tab.querySelectorAll('svg'), tab.textContent ?? 'tab').to.have.length(0);
      expect(tab.querySelectorAll('span'), tab.textContent ?? 'tab').to.have.length(1);
    }
  });
}

function assertShellWorkspaceContextIsRelocated(): void {
  cy.get('[data-slot="shell-top-bar"]').within(() => {
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.visible');
    cy.get('[data-slot="shell-workspace-context-trigger"]').should('not.exist');
    cy.get('[data-slot="shell-project-identity-badge"]').should('not.exist');
    cy.get('[data-slot="shell-workspace-selectors"]').should('not.exist');
    cy.get('[role="combobox"]').should('not.exist');
  });

  cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
  cy.get('[data-slot="shell-menu-workspace-context"]').within(() => {
    cy.get('[data-slot="shell-workspace-context-details"]').should('be.visible');
    cy.get('[data-slot="shell-workspace-tenant-context"]').should('be.visible');
    cy.get('[data-slot="shell-workspace-project-context"]').should('be.visible');
    cy.get('[data-slot="shell-workspace-environment-context"]').should('be.visible');
    cy.get('[data-slot="shell-workspace-tenant-context"]').invoke('text').should('not.be.empty');
    cy.get('[data-slot="shell-workspace-project-context"]').invoke('text').should('not.be.empty');
    cy.get('[data-slot="shell-workspace-environment-context"]')
      .invoke('text')
      .should('not.be.empty');
    cy.get('[role="combobox"]').should('not.exist');
  });
  cy.get('body').type('{esc}', { force: true });
  cy.get('[data-slot="shell-menu-workspace-context"]').should('not.exist');
}

function assertCanvasWorkbenchTabsAreHeaderScoped(): void {
  cy.get('body').then(($body) => {
    const rail = $body[0].querySelector<HTMLElement>('[data-slot="left-navigation-rail"]');
    const railRect = rail?.getBoundingClientRect() ?? null;

    cy.get('[data-slot="shell-top-bar"]').then(($topBar) => {
      const topBarRect = $topBar[0].getBoundingClientRect();

      cy.get('[data-slot="app-shell-outlet"]').then(($outlet) => {
        const outletRect = $outlet[0].getBoundingClientRect();

        cy.get('[data-slot="canvas-workbench-tab-strip"]').then(($strip) => {
          const strip = $strip[0];
          const stripRect = strip.getBoundingClientRect();
          const tabRects = Array.from(
            strip.querySelectorAll<HTMLElement>('[data-slot="canvas-workbench-tab-trigger"]')
          );

          expect(strip.closest('[data-slot="left-navigation-rail"]')).to.equal(null);
          expect(strip.closest('[data-slot="app-shell-outlet"]')).not.to.equal(null);
          expect(stripRect.left).to.be.greaterThan((railRect?.right ?? outletRect.left) - 1);
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
