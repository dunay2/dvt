/**
 * Owned concern: preserve shell geometry and selected semantics across local layout changes.
 * @baseline GH-3578: operation expressions live in the Model inspector, not a retired dock tab.
 * @decision Resize the existing operational drawer while retaining the selected JOIN expression.
 * @consequence Pointer and keyboard layout gestures never remount semantics or save the graph.
 * @version 1.0.0
 */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { revealOperationalDrawer } from '../../support/canvasExecutionSelection';
import { getE2eApiCalls, installE2eApiFetchStub, stubE2eJsonApi } from '../../support/e2eApiStub';
import { pressNativeKey } from '../../support/nativeKeyboard';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
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
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
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

function assertShellCanvasEntries(): void {
  cy.get('a[data-slot="left-navigation-link"][href="/canvas"]')
    .should('have.length', 1)
    .and('be.visible')
    .and('have.attr', 'aria-current', 'page');
  cy.get('[data-slot="canvas-explorer-elements-toggle"]').should('not.exist');
  cy.get('[data-slot="canvas-activity-rail-host"]').should('not.exist');
  cy.get('[data-slot="shell-project-code-command"]')
    .should('have.length', 1)
    .and('be.visible')
    .and('have.attr', 'href', '/canvas')
    .and(($entry) => {
      const entry = $entry[0]!;
      expect(entry.closest('[hidden], [inert], [aria-hidden="true"]')).to.equal(null);
      expect(entry.getAttribute('aria-expanded')).to.be.oneOf(['true', 'false']);
      expect(
        entry.getAttribute('aria-current'),
        'Code disclosure is not route identity'
      ).not.to.equal('page');
      expect(
        Array.from(entry.ownerDocument.querySelectorAll('[id]')).filter(
          (node) => node.id === entry.id
        ),
        'one shell control identity'
      ).to.have.length(1);
      if (entry.getAttribute('aria-expanded') === 'true') {
        expect(
          entry.ownerDocument.getElementById(entry.getAttribute('aria-controls')!)
        ).not.to.equal(null);
      }
    })
    .focus()
    .should('be.focused');
  cy.get('[data-slot="canvas-explorer"]')
    .find('[data-slot="canvas-explorer-elements-toggle"], [data-slot="canvas-explorer-git-toggle"]')
    .should('not.exist');
}
function assertNavigationTargetGeometry(): void {
  // Measure the actual hit target and glyph, not class strings or mocked rectangles.
  cy.get('[data-slot="left-navigation-rail"]')
    .should('be.visible')
    .and(($rail) => expect($rail[0]!.getBoundingClientRect().width).to.be.closeTo(52, 1));
  cy.get('[data-slot="left-navigation-rail"] a, [data-slot="left-navigation-rail"] button').each(
    ($control) => {
      const control = $control[0]!;
      const rect = control.getBoundingClientRect();
      const rail = control.closest('[data-slot="left-navigation-rail"]')!.getBoundingClientRect();
      const icon = control.querySelector('svg')!;
      const glyph = icon.getBoundingClientRect();
      expect(rect.width, 'navigation hit width').to.be.closeTo(44, 1);
      expect(rect.height, 'navigation hit height').to.be.closeTo(44, 1);
      expect(rect.left - rail.left, 'outline clearance').to.be.closeTo(4, 1);
      expect(glyph.width).to.be.closeTo(20, 0.5);
      expect(glyph.height).to.be.closeTo(20, 0.5);
      expect(glyph.left + glyph.width / 2).to.be.closeTo(rect.left + rect.width / 2, 0.5);
      expect(glyph.top + glyph.height / 2).to.be.closeTo(rect.top + rect.height / 2, 0.5);
      expect(icon.getAttribute('aria-hidden')).to.equal('true');
      expect(parseFloat(getComputedStyle(icon).strokeWidth)).to.equal(2);
      expect(control.getAttribute('aria-label')).to.be.a('string').and.not.equal('');
    }
  );
}

describe('Shell layout contract', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    stubShellApis();
  });

  it('keeps direct destinations aligned and About pinned within the full-height rail', () => {
    // The rail stays narrow on global routes while its information action remains reachable.
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
        window.document.querySelectorAll<HTMLElement>(
          '[data-slot="left-navigation-link"], [data-slot="left-navigation-section-trigger"]'
        )
      );

      expect(body, 'shell body').to.not.equal(null);
      expect(wrapper, 'rail wrapper').to.not.equal(null);
      expect(rail, 'left navigation rail').to.not.equal(null);
      expect(nav, 'left navigation nav').to.not.equal(null);
      expect(links.length, 'navigation link count').to.be.greaterThan(2);

      const bodyRect = body!.getBoundingClientRect();
      const wrapperRect = wrapper!.getBoundingClientRect();
      const railRect = rail!.getBoundingClientRect();
      const about = window.document.querySelector('[data-slot="shell-about-command"]')!;
      const aboutRect = about.getBoundingClientRect();

      expect(
        Math.abs(wrapperRect.height - bodyRect.height),
        'wrapper stretches to body height'
      ).to.be.lessThan(2);
      expect(
        Math.abs(railRect.height - wrapperRect.height),
        'rail stretches to wrapper height'
      ).to.be.lessThan(2);
      expect(
        railRect.bottom - aboutRect.bottom,
        'About stays pinned near the rail bottom'
      ).to.be.within(0, 12);
      expect(links.at(-1)!.getBoundingClientRect().bottom).to.be.at.most(aboutRect.top);
    });
    assertNavigationTargetGeometry();
    cy.get('[data-slot="canvas-explorer-elements-toggle"]').should('not.exist');
    cy.viewport(640, 400);
    cy.get('[data-slot="left-navigation-link"], [data-slot="left-navigation-section-trigger"]')
      .last()
      .scrollIntoView()
      .focus()
      .should('be.focused');
    cy.get('[data-slot="shell-about-command"]')
      .should('be.visible')
      .and(($about) => {
        const rect = $about[0]!.getBoundingClientRect();
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom).to.be.at.most(400);
      })
      .focus();
    cy.get('[data-slot="tooltip-content"]').should('be.visible');
    pressNativeKey('Enter');
    cy.get('[data-slot="shell-about-dialog"]').should('be.visible');
    pressNativeKey('Escape');
    cy.get('[data-slot="shell-about-dialog"]').should('not.exist');
    cy.get('[data-slot="shell-about-command"]').should('be.focused');
    cy.document().its('documentElement.scrollWidth').should('be.at.most', 640);
  });

  it('hides the left navigation rail in focus mode while keeping the main shell route visible', () => {
    // Focus mode removes the rail from interaction without inventing a hidden brand menu.
    visitShellRouteWithUiLayout('/plugins', { focusMode: true });

    cy.get('[data-slot="app-shell-left-navigation"]').should('not.exist');
    cy.get('[data-slot="left-navigation-rail"]').should('not.exist');
    cy.get('[data-slot="shell-app-menu-trigger"]').should('not.exist');
    cy.get('[data-slot="app-shell-main"]').should('exist');
    cy.get('[data-slot="app-shell-outlet"]').should('exist');
    cy.get('[data-slot="app-shell-outlet"]')
      .contains(/^Plugins$/)
      .should('be.visible');
  });

  it('retains the same shell through session revalidation and opens Code from another route', () => {
    // Route admission may withhold right-hand content, but must not recreate the frame or its links.
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', substraitInnerJoin: true });
    stubE2eJsonApi('GET', '/workspace/files', []);
    visitShellRouteWithUiLayout('/canvas');
    cy.get('[data-testid="canvas-viewport"]').should('be.visible');
    let frame: HTMLElement;
    let rail: HTMLElement;
    let canvas: HTMLElement;
    let git: HTMLElement;
    let hold = false;
    let sessionRequests = 0;
    const releases: Array<() => void> = [];
    cy.get('[data-slot="app-shell-frame"]').then(($node) => {
      frame = $node[0]!;
    });
    cy.get('[data-slot="left-navigation-rail"]').then(($node) => {
      rail = $node[0]!;
    });
    cy.get('[data-slot="left-navigation-link"][href="/canvas"]').then(($node) => {
      canvas = $node[0]!;
    });
    cy.get('[data-slot="shell-project-code-command"]').then(($node) => {
      git = $node[0]!;
    });
    cy.window().then((window) => {
      const fetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const requestUrl =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (new URL(requestUrl, window.location.href).pathname === '/session') {
          sessionRequests += 1;
          if (hold)
            await new Promise<void>((resolve) => {
              releases.push(resolve);
            });
        }
        return fetch(input, init);
      };
    });
    const assertRetained = (): void => {
      cy.get('[data-slot="app-shell-frame"]').should(($node) => expect($node[0]).to.equal(frame));
      cy.get('[data-slot="left-navigation-rail"]')
        .should('be.visible')
        .and(($node) => expect($node[0]).to.equal(rail));
      cy.get('[data-slot="left-navigation-link"][href="/canvas"]')
        .should('be.visible')
        .and(($node) => expect($node[0]).to.equal(canvas));
      cy.get('[data-slot="shell-project-code-command"]')
        .should('be.visible')
        .and(($node) => expect($node[0]).to.equal(git));
    };
    const releaseSession = (): void => {
      cy.then(() => {
        hold = false;
        expect(releases.length, 'a real session request is waiting').to.be.greaterThan(0);
        releases.splice(0).forEach((release) => release());
      });
    };
    cy.then(() => {
      hold = true;
    });
    cy.get('[data-slot="left-navigation-link"][href="/plugins"]').click();
    cy.location('pathname').should('equal', '/plugins');
    cy.get('[data-slot="app-shell-outlet"]').should('contain.text', 'Checking session...');
    cy.get('[data-slot="app-shell-outlet"]')
      .contains(/^Plugins$/)
      .should('not.exist');
    assertRetained();
    releaseSession();
    cy.get('[data-slot="app-shell-outlet"]')
      .contains(/^Plugins$/)
      .should('be.visible');
    assertRetained();
    cy.then(() => {
      hold = true;
    });
    cy.get('[data-slot="shell-project-code-command"]').focus();
    pressNativeKey('Enter');
    cy.location('pathname').should('equal', '/canvas');
    cy.get('[data-slot="app-shell-outlet"]').should('contain.text', 'Checking session...');
    cy.get('[data-slot="canvas-code-workspace-surface"]').should('not.exist');
    assertRetained();
    releaseSession();
    cy.get('[data-slot="canvas-code-workspace-surface"]').should('be.visible');
    cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.window().its('history.state.usr').should('not.have.property', 'canvasWorkbench');
    assertRetained();
    cy.then(() => {
      expect(sessionRequests, 'consuming state does not revalidate and remount Canvas').to.equal(2);
    });
  });

  it('keeps shell Canvas and Git entries across retained surfaces and respects pending Model edits', () => {
    // Navigation belongs to the shell, independently of retained Canvas, Code and Model panels.
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', substraitInnerJoin: true });
    stubE2eJsonApi('GET', '/workspace/files', [
      { path: 'notes.md', name: 'notes.md', kind: 'file' },
    ]);
    stubE2eJsonApi('GET', '/workspace/files/notes.md', {
      path: 'notes.md',
      name: 'notes.md',
      language: 'markdown',
      content: '# Rail session',
      contentSha256: 'a'.repeat(64),
      lastModified: '2026-10-28T00:00:00Z',
    });
    stubE2eJsonApi('GET', /^\/workspace\/file-history\/.+/, []);
    visitShellRouteWithUiLayout('/canvas');
    const canvas = '[data-slot="canvas-workspace-surface"]';
    const code = '[data-slot="canvas-code-workspace-surface"]';
    const model = '[data-slot="canvas-model-editor"]';
    const modelViewport = `${model} [data-slot="canvas-relational-tree-viewport"], ${model} [data-slot="canvas-relational-tree-draft-viewport"]`;
    cy.get(`${canvas} [data-testid="canvas-viewport"]`).as('retainedCanvas', { type: 'static' });
    assertShellCanvasEntries();
    assertNavigationTargetGeometry();
    cy.get('[data-slot="shell-project-code-command"]').then(($host) => {
      const hostTop = $host[0]!.getBoundingClientRect().top;
      const hostBottom = $host[0]!.getBoundingClientRect().bottom;
      cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').should(($entry) => {
        expect($entry[0]!.getBoundingClientRect().bottom, 'Canvas precedes Git').to.be.at.most(
          hostTop
        );
      });
      cy.get('[data-slot="left-navigation-link"]:not([href="/canvas"])')
        .first()
        .should(($link) => {
          expect(
            $link[0]!.getBoundingClientRect().top,
            'route group follows Git'
          ).to.be.greaterThan(hostBottom);
        });
    });
    cy.get('[data-slot="shell-project-code-command"]').click();
    cy.get(code).should('be.visible');
    cy.get(`${code} [data-workspace-path="notes.md"]`).click();
    cy.get(`${code} .monaco-editor`).should('be.visible').as('retainedCode', { type: 'static' });
    cy.get(canvas).should('have.attr', 'inert');
    assertShellCanvasEntries();
    cy.get('[data-slot="shell-project-code-command"]').should('have.attr', 'aria-expanded', 'true');
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').click();
    cy.get(canvas).should('be.visible');
    // Repeated Canvas activation opens Elements; it must not collapse or recreate the graph.
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]')
      .click()
      .should('have.attr', 'aria-expanded', 'true');
    cy.get(`${canvas} [data-slot="canvas-explorer-panel"]:visible`).should('have.length', 1);
    openWorkbenchModel();
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.get(modelViewport).as('retainedModel', { type: 'static' });
    assertShellCanvasEntries();
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    assertShellCanvasEntries();
    cy.get('[data-slot="canvas-code-main-tab"]').click();
    assertShellCanvasEntries();
    cy.get<JQuery<HTMLElement>>('@retainedCode').then(($original) => {
      cy.get(`${code} .monaco-editor`).should(($current) =>
        expect($current[0]).to.equal($original[0])
      );
    });
    cy.get('[data-slot="canvas-model-main-tab"]').click();
    assertShellCanvasEntries();
    cy.get<JQuery<HTMLElement>>('@retainedModel').then(($original) => {
      cy.get(modelViewport).should(($current) => expect($current[0]).to.equal($original[0]));
    });
    workbenchOperation('filter').scrollIntoView().click();
    cy.get('[data-pending-operation="true"]').should('exist');
    // Staging starts the existing draft presentation; a rejected route change must retain that owner.
    cy.get(modelViewport).as('pendingModel', { type: 'static' });
    cy.get('[data-slot="left-navigation-link"][href="/plugins"]').focus();
    pressNativeKey('Enter');
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.location('pathname').should('eq', '/canvas');
    cy.contains('[role="alertdialog"] button', 'Keep editing').click();
    cy.get('[data-pending-operation="true"]').should('exist');
    cy.get<JQuery<HTMLElement>>('@pendingModel').then(($original) => {
      cy.get(modelViewport).should(($current) => expect($current[0]).to.equal($original[0]));
    });
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-pending-operation="true"]').should('not.exist');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    assertShellCanvasEntries();
    cy.get<JQuery<HTMLElement>>('@retainedCanvas').then(($original) => {
      cy.get(`${canvas} [data-testid="canvas-viewport"]`).should(($current) =>
        expect($current[0]).to.equal($original[0])
      );
    });
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(initialWrites);
      expect(getE2eApiCalls(/^\/workspace\/files\//, 'POST')).to.have.length(0);
    });
  });

  it('uses one drawer controls row and restores fully hidden tabs through a visible keyboard action', () => {
    // The title-only row took content space; removing it must keep close and tab restoration reachable.
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', substraitInnerJoin: true });
    visitShellRouteWithUiLayout('/canvas');
    revealOperationalDrawer();
    const drawer = '[data-slot="bottom-operational-drawer"]';
    const controls = '[data-slot="bottom-operational-drawer-controls"]';
    const close = '[data-slot="bottom-operational-drawer-close"]';
    cy.get(drawer)
      .should('have.attr', 'role', 'region')
      .and('have.attr', 'aria-label', 'Canvas operations');
    cy.get(
      '[data-slot="bottom-operational-drawer-header"], [data-slot="bottom-operational-drawer-title"]'
    ).should('not.exist');
    cy.get(controls).should(($controls) => {
      const row = $controls[0]!;
      const bounds = row.getBoundingClientRect();
      const content = row.nextElementSibling!.getBoundingClientRect();
      const surface = row.parentElement!.getBoundingClientRect();
      const closeControl = row.querySelector(close)!;
      expect(row.querySelector('[role="tablist"]')).not.to.equal(null);
      expect(closeControl.closest('[role="tablist"]')).to.equal(null);
      expect(bounds.height, 'one controls row at desktop width').to.be.at.most(44);
      expect(content.top).to.be.closeTo(bounds.bottom, 1);
      expect(content.height, 'remaining height belongs to content').to.be.closeTo(
        surface.height - bounds.height - 1,
        2
      );
    });
    cy.get(drawer).screenshot('compact-operational-drawer');
    cy.get('[data-slot="bottom-operational-drawer-tab-close"]').each(($button) => {
      cy.wrap($button).click();
    });
    cy.get(`${drawer} [role="tablist"]`).should('not.exist');
    cy.get('[data-slot="bottom-operational-drawer-restore"]')
      .should('be.visible')
      .focus()
      .should('be.focused');
    pressNativeKey('Enter');
    cy.get('[data-restore-tab="log"]').should('be.visible').focus();
    pressNativeKey('Enter');
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="log"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.viewport(640, 480);
    cy.get(controls).should(($row) => {
      expect($row[0]!.scrollWidth).to.be.at.most($row[0]!.clientWidth + 1);
    });
    cy.get(close).should('be.visible').focus();
    pressNativeKey('Enter');
    cy.get(drawer).should('not.exist');
  });

  it('keeps the drawer closable on a route without operational tabs', () => {
    // A shell log companion has no Canvas contribution and must not fabricate an empty tablist.
    visitShellRouteWithUiLayout('/cost');
    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.contains('[role="menuitemcheckbox"]', /^Operations$/).click();
    cy.get('[data-slot="bottom-operational-drawer"]')
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Operations');
    cy.get('[data-slot="bottom-operational-drawer"] [role="tablist"]').should('not.exist');
    cy.get('[data-slot="bottom-operational-drawer-header"]').should('not.exist');
    cy.get('[data-slot="bottom-operational-drawer-close"]').click();
    cy.get('[data-slot="bottom-operational-drawer"]').should('not.exist');
  });

  it('resizes the operational drawer without losing the selected expression or saving a draft', () => {
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', substraitInnerJoin: true });
    visitShellRouteWithUiLayout('/canvas', { bottomDrawerVisible: false });
    openWorkbenchModel();
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    const expressionTab = '[data-slot="canvas-operation-tree-tab"]';
    cy.get(expressionTab).click().should('have.attr', 'aria-selected', 'true');
    const expression =
      '[data-slot="canvas-relational-tree-inline-editor"] [data-slot="canvas-relational-expression-tree"]';
    cy.get(expression).find('[data-slot="canvas-relational-expression-node"]').first().click();
    revealOperationalDrawer();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]').click();

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

    cy.get(expression).then(($semantic) => {
      const semanticElement = $semantic[0];
      const expressionText = $semantic.text();
      const selectedExpression = $semantic
        .find('[aria-pressed="true"]')
        .attr('data-semantic-node-id');
      expect(selectedExpression, 'selected expression identity').to.be.a('string');
      const saveCount = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      dragDrawerTo(95);
      cy.get(drawer).should('have.attr', 'data-panel-size', '90.0');
      cy.get(handle).find('svg').should('be.visible');
      cy.get(expressionTab).should('have.attr', 'aria-selected', 'true');
      dragDrawerTo(35);
      cy.get(drawer).should(($drawer) => {
        expect(Number($drawer.attr('data-panel-size'))).to.be.closeTo(35, 1);
      });

      cy.get(handle).focus().should('be.focused');
      pressNativeKey('Home');
      cy.get(drawer).should('have.attr', 'data-panel-size', '90.0');
      pressNativeKey('End');
      cy.get(drawer).should(($drawer) => {
        expect(
          $drawer[0]!.getBoundingClientRect().height,
          'minimum usable drawer height'
        ).to.be.closeTo(160, 2);
      });
      pressNativeKey('ArrowUp');
      cy.get(expression).should(($current) => {
        expect($current[0]).to.equal(semanticElement);
        expect($current.text()).to.equal(expressionText);
        expect($current.find('[aria-pressed="true"]').attr('data-semantic-node-id')).to.equal(
          selectedExpression
        );
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.equal(saveCount);
      });
      cy.get(expressionTab).should('have.attr', 'aria-selected', 'true');
      cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]').should(
        'have.attr',
        'aria-selected',
        'true'
      );
      cy.get(drawer).then(($drawer) => {
        const rememberedHeight = $drawer[0]!.getBoundingClientRect().height;
        expect(rememberedHeight, 'keyboard resize has a larger saved height').to.be.greaterThan(
          160
        );
        cy.window().should((window) => {
          const saved = JSON.parse(window.localStorage.getItem('dvt-web-ui-layout')!);
          expect(
            saved.state.bottomDrawerHeight,
            'actual resize reached the layout owner'
          ).to.be.closeTo(rememberedHeight, 2);
        });
        cy.get('[data-slot="bottom-operational-drawer-close"]').click();
        cy.get(drawer).should('not.exist');
        revealOperationalDrawer();
        cy.get(drawer).should(($reopened) => {
          expect(
            $reopened[0]!.getBoundingClientRect().height,
            'close and reveal retain size'
          ).to.be.closeTo(rememberedHeight, 2);
          expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.equal(saveCount);
        });
        // Reload creates a new Window; retain the controlled API transport without reseeding layout.
        const sessionReads = getE2eApiCalls('/session', 'GET').length;
        cy.on('window:before:load', installE2eApiFetchStub);
        cy.reload();
        cy.get(drawer).should(($reloaded) => {
          expect(
            $reloaded[0]!.getBoundingClientRect().height,
            'reload retains the resized height'
          ).to.be.closeTo(rememberedHeight, 2);
          expect(getE2eApiCalls('/session', 'GET').length).to.be.greaterThan(sessionReads);
          expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.equal(saveCount);
        });
      });
    });
  });
});
