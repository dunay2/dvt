/** Owned concern: prove route workbench slots render correctly in browser UX flows. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  getLastE2eApiCall,
  installE2eApiFetchStub,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { pressNativeKey } from '../../support/nativeKeyboard';
import {
  E2E_PROJECT_WORKSPACE,
  type ShellBootstrapApiOptions,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const WORKSPACE_FILE_TREE = [
  {
    path: 'models',
    name: 'models',
    kind: 'directory',
    children: [
      {
        path: 'models/staging/stg_orders.sql',
        name: 'stg_orders.sql',
        kind: 'file',
      },
    ],
  },
];

function stubRouteWorkbenchBootstrapApis(options: ShellBootstrapApiOptions = {}): void {
  stubShellBootstrapApis({
    ...options,
    capabilities: options.capabilities ?? {
      body: {
        apiVersion: '1.0.0',
        minFrontendVersion: '1.0.0',
        plugins: {
          dbt: { available: true },
          dvt: { available: true },
          monitoring: { available: true },
          cost: { available: true },
        },
      },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/workspace/plugins', {
    plugins: [
      {
        id: 'backend-only',
        name: 'Backend only',
        version: '0.5.3',
        description: 'Backend service without a frontend contribution.',
        capabilities: ['run.observe'],
        enabled: true,
        permissions: [],
        backendPluginId: 'monitoring',
      },
      {
        id: 'unbound',
        name: 'Unbound catalog entry',
        version: '0.5.3',
        description: 'Catalog entry without a runtime binding.',
        capabilities: [],
        enabled: true,
        permissions: [],
      },
    ],
  });
}

function stubCodeWorkbenchApis(): void {
  stubRouteWorkbenchBootstrapApis();
  stubCanvasDraftRead();
  stubE2eJsonApi('GET', '/workspace/files', WORKSPACE_FILE_TREE);
  stubE2eJsonApi('GET', /\/workspace\/files\/.+/, {
    path: 'models/staging/stg_orders.sql',
    name: 'stg_orders.sql',
    language: 'sql',
    content: 'select * from orders',
    contentSha256: 'a'.repeat(64),
    lastModified: '2026-05-04T00:00:00.000Z',
  });
  stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
  stubE2eApi('POST', /\/workspace\/files\/.+/, () => {
    throw new Error('Read-only Code inspection must not save workspace files.');
  });
}

function assertPrimaryRouteWorkbench(): void {
  cy.get('[data-slot="app-route-error-boundary"]').should('not.exist');
  cy.get('[data-slot="route-workbench-frame"]').should('be.visible');
  cy.get('[data-slot="route-workbench-body"]').should('be.visible');
  cy.get('[data-slot="route-workbench-primary-surface"]').should('be.visible');
}

describe('Route workbench semantic slots', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
  });

  it('renders Plugins and Admin through the no-legacy primary route slot', () => {
    stubRouteWorkbenchBootstrapApis();
    visitWithE2eWorkspaceSession('/plugins');

    assertPrimaryRouteWorkbench();
    cy.get('[data-slot="route-workbench-header"]')
      .contains(/Plugins/)
      .should('be.visible');
    cy.get('[data-slot="plugins-capability-probe"]').should('be.visible');
    cy.get('[data-slot="plugin-capability-row"]').should('have.length', 2);
    cy.get('[data-plugin-id="backend-only"]')
      .should('have.attr', 'data-runtime-shape', 'backend-only')
      .and('have.attr', 'data-frontend-presence', 'not-registered')
      .and('have.attr', 'data-backend-state', 'available')
      .and('have.attr', 'data-operational-state', 'ready');
    cy.get('[data-plugin-id="unbound"]')
      .should('have.attr', 'data-runtime-shape', 'unbound')
      .and('have.attr', 'data-backend-state', 'not-bound')
      .and('have.attr', 'data-operational-state', 'unbound');
    cy.get('[data-slot="plugin-local-registry-diagnostic"]').should('be.visible');
    cy.get('[data-slot="plugin-frontend-state-filter"]').select('unbound');
    cy.get('[data-slot="plugin-capability-row"]')
      .should('have.length', 1)
      .and('have.attr', 'data-plugin-id', 'unbound');

    stubRouteWorkbenchBootstrapApis();
    visitWithE2eWorkspaceSession('/admin');

    assertPrimaryRouteWorkbench();
    cy.get('[data-slot="shell-top-bar"] h1').should('have.text', 'Admin & RBAC');
    cy.get('[data-slot="route-workbench-header"]').should('not.exist');
    cy.get('[data-slot="left-navigation-section-trigger"][data-route="/admin"]').click();
    cy.get('[data-slot="shell-route-section-link"][data-section="roles"]').click();
    cy.location('search').should('contain', 'tab=roles');
    cy.get('[data-slot="route-workbench-primary-surface"] [data-slot="admin-section"]')
      .should('have.attr', 'data-section', 'roles')
      .and('have.attr', 'aria-label', 'Roles')
      .and('be.visible');
  });

  it('keeps the contextual Code explorer left and read-only file viewer primary', () => {
    stubCodeWorkbenchApis();
    visitWithE2eWorkspaceSession('/canvas');

    cy.get('[data-slot="shell-project-code-command"]').click();

    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    assertPrimaryRouteWorkbench();
    cy.get('[data-slot="route-workbench-left-panel"]')
      .contains(/Explorer|Explorador/)
      .should('be.visible');
    cy.get('[data-slot="route-workbench-left-panel"]')
      .contains('stg_orders.sql')
      .should('be.visible');
    cy.get('[data-slot="route-workbench-primary-surface"] [data-slot="code-working-tree-status"]')
      .should('be.visible')
      .and('have.attr', 'data-phase', 'read_only');
    cy.get(
      '[data-slot="canvas-code-workspace-surface"] [data-slot="route-workbench-right-panel"] [role="region"]'
    )
      .should('be.visible')
      .and('contain.text', 'models/staging/stg_orders.sql');
    cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
    cy.get('[data-testid="monaco-code-viewer"] .view-line').first().click();
    cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea')
      .should('have.prop', 'readOnly', true)
      .and('be.focused');
    cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea').type('blocked_route_edit', {
      force: true,
      delay: 0,
    });
    cy.get('[data-testid="monaco-code-viewer"] .view-lines')
      .invoke('text')
      .should('match', /select\s+\*\s+from\s+orders/)
      .and('not.contain', 'blocked_route_edit');
    cy.then(() => expect(getLastE2eApiCall(/\/workspace\/files\/.+/, 'POST')).to.equal(null));
  });
});

describe('Admin operational observations', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
  });

  it('shows observed readiness, optional version absence and exact plugin reasons', () => {
    // Missing probes previously appeared amber while the summary called them healthy.
    const optionalDisabled = Cypress.env('PLATFORM_HEALTH_EXPECT_OPTIONAL_DISABLED') === true;
    stubRouteWorkbenchBootstrapApis({
      capabilities: {
        body: {
          apiVersion: '1.0.0',
          minFrontendVersion: '1.0.0',
          plugins: {
            dbt: { available: true },
            dvt: { available: true },
            monitoring: { available: true },
            cost: { available: false, reason: 'Disabled by the operator policy.' },
          },
        },
      },
      health: {
        readyz: { body: { ok: true, status: 'ready' } },
        dbReady: { body: { ok: true } },
        version: { body: { error: 'not exposed' }, statusCode: 404 },
      },
    });
    visitWithE2eWorkspaceSession('/admin');
    const readyz = '[data-slot="admin-health-summary"][data-probe="readyz"]';
    const version = '[data-slot="admin-health-summary"][data-probe="version"]';
    cy.get('[data-slot="admin-health-summary"][data-probe="backend"]').should(
      'contain.text',
      'Online'
    );
    cy.get(readyz)
      .should('contain.text', optionalDisabled ? 'Not requested' : 'Ready')
      .and('have.attr', 'data-tone', optionalDisabled ? 'neutral' : 'success');
    cy.get('[data-slot="admin-health-probe"][data-endpoint="/readyz"]').should(
      'contain.text',
      optionalDisabled ? 'Not requested' : 'Ready'
    );
    cy.get(version)
      .should('contain.text', optionalDisabled ? 'Not requested' : 'Not exposed')
      .and('have.attr', 'data-tone', 'neutral');
    cy.get('[data-slot="admin-plugin-capability"][data-plugin-id="cost"]')
      .should('contain.text', 'Disabled by the operator policy.')
      .and('contain.text', 'blocked');
    cy.get('[data-slot="route-workbench-primary-surface"]').should(
      'not.contain.text',
      'readyz endpoint healthy'
    );
    cy.then(() => {
      expect(getLastE2eApiCall('/readyz', 'GET') === null).to.equal(optionalDisabled);
      expect(getLastE2eApiCall('/version', 'GET') === null).to.equal(optionalDisabled);
    });
    cy.viewport(640, 768);
    cy.get('[data-slot="admin-health-summary"]').should('have.length', 4);
    cy.document().its('documentElement.scrollWidth').should('be.at.most', 640);
  });

  it('keeps access denial and backend not-ready reasons distinct from optional absence', () => {
    // Available transport with an HTTP failure must never produce a successful version badge.
    const optionalDisabled = Cypress.env('PLATFORM_HEALTH_EXPECT_OPTIONAL_DISABLED') === true;
    stubRouteWorkbenchBootstrapApis({
      health: {
        readyz: { body: { error: 'forbidden' }, statusCode: 403 },
        dbReady: {
          body: { ok: false, reason: 'Database diagnostics unavailable.' },
          statusCode: 503,
        },
        version: { body: { name: 'dvt-api', version: 'untrusted-error-version' }, statusCode: 500 },
      },
    });
    visitWithE2eWorkspaceSession('/admin');
    cy.get('[data-slot="admin-health-summary"][data-probe="readyz"]')
      .should('contain.text', optionalDisabled ? 'Not requested' : 'Access denied')
      .and('have.attr', 'data-tone', optionalDisabled ? 'neutral' : 'danger');
    cy.get('[data-slot="admin-health-summary"][data-probe="version"]')
      .should('contain.text', optionalDisabled ? 'Not requested' : 'Probe failed')
      .and('not.contain.text', 'untrusted-error-version');
    cy.get('[data-slot="admin-health-summary"][data-probe="dbReady"]').should(
      'contain.text',
      optionalDisabled ? 'Not requested' : 'Not ready'
    );
    if (!optionalDisabled) {
      cy.get(
        '[data-slot="admin-health-probe"][data-endpoint="/readyz"] [data-tone="danger"]'
      ).should('contain.text', 'Access denied');
      cy.get('[data-slot="admin-health-probe"][data-endpoint="/db/ready"]')
        .should('contain.text', 'Database diagnostics unavailable.')
        .and('contain.text', '503');
    }
  });
});

describe('Admin shell sections', () => {
  it('keeps one compact shell heading and durable section navigation at the Admin icon', () => {
    // Moving controls must preserve URL position, keyboard focus and the mounted shell.
    cy.viewport(1400, 900);
    stubRouteWorkbenchBootstrapApis();
    visitWithE2eWorkspaceSession('/admin?tab=permissions&filter=read#matrix');
    const trigger = '[data-slot="left-navigation-section-trigger"][data-route="/admin"]';
    cy.get('[data-slot="shell-top-bar"] h1').should('have.text', 'Admin & RBAC');
    cy.get('[data-slot="route-workbench-header"], [role="tablist"]').should('not.exist');
    cy.get('[data-slot="admin-section"]').should('have.attr', 'data-section', 'permissions');
    cy.get('[data-slot="app-shell-frame"]').as('adminFrame', { type: 'static' });
    cy.get('[data-slot="left-navigation-rail"]').as('adminRail', { type: 'static' });
    cy.get(trigger)
      .as('adminTrigger', { type: 'static' })
      .should('have.attr', 'aria-haspopup', 'menu')
      .and('have.attr', 'aria-current', 'page')
      .click();
    cy.get('[data-slot="shell-route-section-link"]').should('have.length', 4);
    cy.get('[data-slot="shell-route-section-link"][data-section="permissions"]').should(
      'have.attr',
      'aria-current',
      'page'
    );
    cy.get('[role="menu"]').should(($menu) => {
      const rect = $menu[0]!.getBoundingClientRect();
      expect(rect.left).to.be.at.least(52);
      expect(rect.right).to.be.at.most(1400);
      expect(rect.bottom).to.be.at.most(900);
    });
    pressNativeKey('Escape');
    cy.get('@adminTrigger').should('be.focused');
    pressNativeKey('Enter');
    cy.get('[data-slot="shell-route-section-link"][data-section="audit"]').focus();
    pressNativeKey('Enter');
    cy.location('search').should('contain', 'tab=audit').and('contain', 'filter=read');
    cy.location('hash').should('equal', '#matrix');
    cy.get('[data-slot="admin-section"]').should('have.attr', 'data-section', 'audit');
    cy.get('input[placeholder="Search audit log..."]').should('be.visible');
    cy.get('@adminFrame').should('be.visible');
    cy.get('@adminRail').should('be.visible');
    cy.get('@adminTrigger').should('be.visible');
    cy.go('back');
    cy.get('[data-slot="admin-section"]').should('have.attr', 'data-section', 'permissions');
    let sessionReads = 0;
    let draftWrites = 0;
    cy.then(() => {
      sessionReads = getE2eApiCalls('/session', 'GET').length;
      draftWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    // A new Window needs the same controlled transport; the application still performs admission.
    cy.on('window:before:load', installE2eApiFetchStub);
    cy.reload();
    cy.get('[data-slot="admin-section"]').should('have.attr', 'data-section', 'permissions');
    cy.then(() => {
      expect(getE2eApiCalls('/session', 'GET').length).to.be.greaterThan(sessionReads);
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(draftWrites);
    });
    cy.viewport(640, 768);
    cy.get(trigger).should('be.visible').click();
    cy.get('[data-slot="shell-route-section-link"][data-section="platform"]').click();
    cy.get('[data-slot="admin-section"]').should('have.attr', 'data-section', 'platform');
    cy.document().its('documentElement.scrollWidth').should('be.at.most', 640);
    cy.screenshot('admin-shell-sections');
    visitWithE2eWorkspaceSession('/admin?tab=invalid');
    cy.get('[data-slot="admin-section"]').should('have.attr', 'data-section', 'platform');
  });
});
