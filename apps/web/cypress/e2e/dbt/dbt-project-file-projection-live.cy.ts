/**
 * Owned concern: prove the file-authoritative dbt Canvas against real workspace
 * files, protected HTTP, server-side dbt parse, and browser rendering.
 */
import {
  adoptLiveDbtProjectFileAuthority,
  replaceLiveWorkspaceFile,
  requestLiveDbtProjectGraph,
  seedLiveWorkspaceFiles,
} from '../../support/dbtProjectLive';
import { seedLiveSelectedClosureDraft } from '../../support/liveCanvasDraftAuthoring';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveWorkspaceFile,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { openWorkbenchProperties } from '../../support/relationalWorkbench/navigation';

const PROJECT_ROOT = 'analytics-file-projection';
const INVALID_PROJECT_ROOT = 'analytics-invalid';
const CANVAS_ID = 'analytics-file-projection-files';
const INVALID_CANVAS_ID = 'analytics-invalid-files';

const INVALID_PROJECT_CONFIG = `
name: analytics_invalid
version: '1.0.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['../outside-project']
`;

const PROJECT_FILES: Readonly<Record<string, string>> = {
  [`${PROJECT_ROOT}/dbt_project.yml`]: `
name: analytics
version: '1.0.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['models']
seed-paths: ['seeds']
snapshot-paths: ['snapshots']
clean-targets: ['target', 'dbt_packages']
`,
  [`${PROJECT_ROOT}/models/schema.yml`]: `
version: 2
sources:
  - name: raw
    schema: public
    tables:
      - name: orders
        description: Governed order intake
        columns:
          - name: order_id
            data_type: integer
            description: Stable order identifier
          - name: customer_id
            data_type: text
models:
  - name: orders
    description: Curated orders model
    columns:
      - name: order_id
        data_type: integer
        tests:
          - not_null
          - unique
      - name: customer_id
        data_type: text
exposures:
  - name: orders_dashboard
    label: Orders dashboard
    type: dashboard
    maturity: high
    url: https://example.invalid/orders
    depends_on:
      - ref('orders')
    owner:
      name: Analytics
      email: analytics@example.invalid
`,
  [`${PROJECT_ROOT}/models/orders.sql`]: `
select
  1::integer as order_id,
  'customer-1'::text as customer_id
from {{ source('raw', 'orders') }}
`,
  [`${PROJECT_ROOT}/seeds/country_codes.csv`]: `code,name
ES,Spain
PT,Portugal
`,
  [`${PROJECT_ROOT}/snapshots/orders_snapshot.sql`]: `
{% snapshot orders_snapshot %}
{{ config(target_schema='snapshots', unique_key='order_id', strategy='check', check_cols=['customer_id']) }}
select * from {{ ref('orders') }}
{% endsnapshot %}
`,
};

type DragPoint = Readonly<{ x: number; y: number }>;

function buildMouseEvent(
  point: DragPoint,
  buttons: number,
  view: Cypress.AUTWindow
): MouseEventInit {
  return {
    bubbles: true,
    button: buttons === 0 ? 0 : 0,
    buttons,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    screenX: point.x,
    screenY: point.y,
    view,
  };
}

function dispatchDragEvent(
  target: EventTarget,
  view: Cypress.AUTWindow,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  point: DragPoint,
  buttons: number
): void {
  target.dispatchEvent(new view.MouseEvent(type, buildMouseEvent(point, buttons, view)));
}

function dragNode(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"]`).then(($node) => {
    const node = $node[0];
    if (node === undefined) throw new Error(`Expected the projected node ${nodeId}.`);
    const rect = node.getBoundingClientRect();
    const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const middle = { x: start.x + 30, y: start.y + 24 };
    const end = { x: start.x + 110, y: start.y + 78 };

    cy.window().then((window) => {
      dispatchDragEvent(node, window, 'mousedown', start, 1);
      dispatchDragEvent(window, window, 'mousemove', middle, 1);
      dispatchDragEvent(window, window, 'mousemove', end, 1);
      dispatchDragEvent(window, window, 'mouseup', end, 0);
    });
  });
}

function expectProjectedCardsNotToOverlap(): void {
  cy.get('.react-flow__node').then(($nodes) => {
    const cards = Array.from($nodes, (node) => ({
      id: node.getAttribute('data-id') ?? 'unknown',
      rect: node.getBoundingClientRect(),
    }));

    for (const [index, left] of cards.entries()) {
      for (const right of cards.slice(index + 1)) {
        const separated =
          left.rect.right <= right.rect.left ||
          right.rect.right <= left.rect.left ||
          left.rect.bottom <= right.rect.top ||
          right.rect.bottom <= left.rect.top;
        expect(separated, `${left.id} must not overlap ${right.id}`).to.equal(true);
      }
    }
  });
}

function placeCatalogueResource(resourceId: string, ordinal: number): void {
  cy.get(`[data-element-id="${resourceId}"]`)
    .filter(':visible')
    .should('have.prop', 'draggable', true)
    .then(($row) => {
      cy.get('[data-slot="canvas-viewport-context-surface"] .react-flow').then(($surface) => {
        cy.window().then((window) => {
          const transfer = new window.DataTransfer();
          const bounds = $surface[0]!.getBoundingClientRect();
          const options = {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
            clientX: bounds.left + 220 + ordinal * 90,
            clientY: bounds.top + 180 + ordinal * 70,
          };
          $row[0]!.dispatchEvent(new window.DragEvent('dragstart', options));
          $surface[0]!.dispatchEvent(new window.DragEvent('dragover', options));
          $surface[0]!.dispatchEvent(new window.DragEvent('drop', options));
          $row[0]!.dispatchEvent(new window.DragEvent('dragend', options));
        });
      });
    });
}

type ResourcePlacement = Readonly<{ id: string; resourceId: string }>;
function readSavedPlacements(window: Cypress.AUTWindow): ResourcePlacement[] {
  const persisted = JSON.parse(
    window.localStorage.getItem('dvt-web-canvas-interaction') ?? '{}'
  ) as {
    state?: { canvasLayouts?: Record<string, { resourceInstances?: ResourcePlacement[] }> };
  };
  return Object.entries(persisted.state?.canvasLayouts ?? {})
    .filter(([key]) => key.includes(CANVAS_ID) && key.endsWith(PROJECT_ROOT))
    .flatMap(([, layout]) => layout.resourceInstances ?? []);
}

describe('dbt project file projection live vertical', () => {
  before(() => {
    if (!hasLiveProtectedRuntimeEnv()) {
      throw new Error('The file-project proof requires its real protected runtime.');
    }
    const environmentId = Cypress.env('projectFilesEnvironmentId');
    if (typeof environmentId !== 'string' || environmentId.trim().length === 0) {
      throw new Error('The file-project proof requires its dedicated fixture environment.');
    }
    Cypress.env('workspaceEnvironmentId', environmentId);

    return seedLiveSelectedClosureDraft()
      .then(() => seedLiveWorkspaceFiles(PROJECT_FILES))
      .then(() => adoptLiveDbtProjectFileAuthority(PROJECT_ROOT, CANVAS_ID));
  });

  it('projects real dbt files without draft semantics and remains inspectable', () => {
    const observedRequests: string[] = [];
    const observedFileWrites: string[] = [];
    cy.intercept('GET', '**/workspace/dbt/graph?*', (request) => {
      observedRequests.push(request.url);
    });
    cy.intercept('POST', '**/workspace/files/**', (request) => {
      observedFileWrites.push(request.url);
    });
    readLiveWorkspaceFile(`${PROJECT_ROOT}/models/orders.sql`).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property(
        'content',
        PROJECT_FILES[`${PROJECT_ROOT}/models/orders.sql`]
      );
      cy.wrap(response.body)
        .its('contentSha256')
        .should('match', /^[a-f0-9]{64}$/)
        .as('openedModelRevision');
    });
    cy.viewport(1500, 900);
    requestLiveDbtProjectGraph(PROJECT_ROOT, CANVAS_ID).then((response) => {
      const body = response.body as {
        readonly freshness?: unknown;
        readonly diagnostics?: unknown;
      };
      expect(response.status).to.equal(200);
      expect(body.freshness, JSON.stringify(body.diagnostics)).to.equal('fresh');
    });
    visitWithLiveWorkspaceSession(
      `/canvas?authority=dbt-project-files&canvasId=${CANVAS_ID}&projectRoot=${PROJECT_ROOT}`,
      {
        onBeforeLoad(window) {
          window.localStorage.setItem(
            'dvt-web-application-language',
            JSON.stringify({ state: { language: 'en' }, version: 0 })
          );
        },
      }
    );

    cy.get('.react-flow__node[data-id="source.analytics.raw.orders"]', {
      timeout: 60_000,
    })
      .should('be.visible')
      .and('contain.text', 'orders');
    cy.get('.react-flow__node[data-id="model.analytics.orders"]')
      .should('be.visible')
      .find('[data-slot="graph-node-column-toggle"]')
      .should('contain.text', 'Columns (2)');
    cy.get('.react-flow__node[data-id="model.analytics.orders"]')
      .find('[data-slot="graph-node-operational-rail"]')
      .within(() => {
        cy.contains('Rows').should('be.visible');
        cy.contains('Size').should('be.visible');
      });
    cy.get('[data-slot="canvas-viewport-context-surface"] .react-flow__node').should(
      'have.length',
      7
    );
    cy.get('[data-slot="canvas-viewport-context-surface"] .react-flow__controls-fitview').click();
    cy.get('.react-flow__node[data-id="seed.analytics.country_codes"]').should('be.visible');
    cy.get('.react-flow__node[data-id="snapshot.analytics.orders_snapshot"]').should('be.visible');
    cy.get('.react-flow__node[data-id="exposure.analytics.orders_dashboard"]').should('be.visible');
    cy.get('.react-flow__node[data-id^="test.analytics.not_null_orders_order_id."]')
      .should('be.visible')
      .and('contain.text', 'Not Null Orders Order Id');
    cy.get('.react-flow__node[data-id^="test.analytics.unique_orders_order_id."]')
      .should('be.visible')
      .and('contain.text', 'Unique Orders Order Id');
    cy.get('.react-flow__edge').should('have.length.greaterThan', 0);
    expectProjectedCardsNotToOverlap();

    cy.wrap(null).should(() => {
      expect(observedRequests.some((url) => url.includes('/workspace/dbt/graph?'))).to.equal(true);
    });
    cy.window().should((window) => {
      expect(
        window.performance
          .getEntriesByType('resource')
          .some((entry) => entry.name.includes('/workspace/graph/draft')),
        'no graph-draft request during file-authoritative rendering'
      ).to.equal(false);
    });
    cy.get('[data-slot="dbt-project-file-projection-notice"]')
      .should('be.visible')
      .and('contain.text', 'require code');
    cy.get('[data-slot="bottom-operational-drawer-tab"]').should('not.exist');

    cy.get('[data-slot="canvas-explorer-sources-toggle"]').should('not.exist');
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]')
      .click()
      .should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-element-id="source.analytics.raw.orders"]')
      .filter(':visible')
      .should('be.enabled')
      .and('have.prop', 'draggable', true);
    openWorkbenchProperties('source.analytics.raw.orders');
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('contain.text', 'orders');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]')
      .should('contain.text', 'order_id')
      .and('contain.text', 'customer_id');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.get('[data-slot="canvas-viewport-context-surface"] .react-flow__node').should(
      'have.length',
      7
    );
    cy.then(() => expect(observedFileWrites).to.deep.equal([]));

    cy.get('.react-flow__node[data-id="model.analytics.orders"]').then(($node) => {
      const node = $node[0];
      if (node === undefined) throw new Error('Expected the projected model before movement.');
      const rect = node.getBoundingClientRect();
      cy.wrap({ left: rect.left, top: rect.top }).as('originalModelPosition');
    });
    dragNode('model.analytics.orders');
    cy.get<{ left: number; top: number }>('@originalModelPosition').then((original) => {
      cy.get('.react-flow__node[data-id="model.analytics.orders"]').should(($node) => {
        const node = $node[0];
        if (node === undefined) throw new Error('Expected the moved projected model.');
        const rect = node.getBoundingClientRect();
        expect(
          Math.abs(rect.left - original.left) + Math.abs(rect.top - original.top)
        ).to.be.greaterThan(20);
      });
    });
    cy.get('.react-flow__node[data-id="model.analytics.orders"]').then(($node) => {
      const node = $node[0];
      if (node === undefined) throw new Error('Expected the settled projected model.');
      const transform = new DOMMatrix(node.style.transform);
      const position = { x: transform.m41, y: transform.m42 };
      cy.wrap(position).as('settledModelPosition');
      cy.window().should((window) => {
        const saved = JSON.parse(
          window.localStorage.getItem('dvt-web-canvas-interaction') ?? '{}'
        ) as {
          state?: {
            canvasLayouts?: Record<
              string,
              { nodePositions: Record<string, { x: number; y: number }> }
            >;
          };
        };
        const positions = Object.values(saved.state?.canvasLayouts ?? {}).map(
          (layout) => layout.nodePositions['model.analytics.orders']
        );
        const savedPosition = positions.find((candidate) => candidate != null);
        expect(savedPosition, 'persisted drag-stop coordinates').not.to.equal(undefined);
        expect(savedPosition?.x).to.be.closeTo(position.x, 0.001);
        expect(savedPosition?.y).to.be.closeTo(position.y, 0.001);
      });
    });
    cy.wait(400);
    cy.reload();
    cy.get<{ x: number; y: number }>('@settledModelPosition').then((settled) => {
      cy.get('.react-flow__node[data-id="model.analytics.orders"]', { timeout: 60_000 }).should(
        ($node) => {
          const node = $node[0];
          if (node === undefined) throw new Error('Expected the restored projected model.');
          const transform = new DOMMatrix(node.style.transform);
          expect(transform.m41, 'restored Canvas x').to.be.closeTo(settled.x, 0.001);
          expect(transform.m42, 'restored Canvas y').to.be.closeTo(settled.y, 0.001);
        }
      );
    });

    // Inspect the node with one click, then request its Code section explicitly.
    cy.get('.react-flow__node[data-id="model.analytics.orders"]')
      .find('[data-slot="graph-node-card-title"]')
      .click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-tab-code"]')
      .should('be.visible')
      .click()
      .and('have.attr', 'aria-selected', 'true');

    // Properties Code inspects the authoritative file without changing it.
    cy.get('[data-slot="workspace-file-code-editor"]', { timeout: 30_000 })
      .should('be.visible')
      .and('have.attr', 'data-file-path', `${PROJECT_ROOT}/models/orders.sql`);
    cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
    cy.get('[data-testid="monaco-code-viewer"]', { timeout: 30_000 })
      .find('.view-lines')
      .invoke('text')
      .should((editorText) => {
        expect(editorText.replaceAll('\u00a0', ' ')).to.match(
          /source\(\s*'raw'\s*,\s*'orders'\s*\)/
        );
      });
    cy.get('[data-testid="monaco-code-viewer"] .view-line').first().click();
    cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea')
      .should('have.prop', 'readOnly', true)
      .and('be.focused');
    cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea').type(
      'blocked_projection_edit',
      { force: true, delay: 0 }
    );
    cy.get('@openedModelRevision').then((revision) => {
      readLiveWorkspaceFile(`${PROJECT_ROOT}/models/orders.sql`).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property(
          'content',
          PROJECT_FILES[`${PROJECT_ROOT}/models/orders.sql`]
        );
        expect(response.body).to.have.property('contentSha256', revision);
        expect(observedFileWrites).to.deep.equal([]);
      });
    });
    cy.get('[data-slot="canvas-contextual-workbench"]').should('not.exist');

    // Other Properties sections remain in the same node context.
    cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-help"]')
      .should('be.visible')
      .and('have.attr', 'aria-label');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]')
      .should('contain.text', 'order_id')
      .and('contain.text', 'integer')
      .and('contain.text', 'customer_id');
    cy.get('[data-slot="canvas-node-workbench-tab-tests"]').click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]')
      .should('contain.text', 'Value is present')
      .and('contain.text', 'blocks run');

    cy.get('[data-slot="canvas-node-workbench-close"]').should('be.visible').click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');

    // The shared context menu keeps one Properties entry for node inspection.
    cy.get('.react-flow__node[data-id="model.analytics.orders"]')
      .find('[data-slot="graph-node-card-title"]')
      .rightclick();
    cy.get('[data-slot="canvas-node-context-menu"]', { timeout: 20_000 })
      .should('be.visible')
      .within(() => {
        cy.contains('[role="menuitem"]', 'Properties').should('be.visible');
        cy.contains('[role="menuitem"]', 'Open code').should('not.exist');
      });
    cy.get('body').type('{esc}', { force: true });
    cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
  });

  it('creates, restores, inspects and removes independent source and model references without SQL writes', () => {
    const writes: string[] = [];
    cy.intercept({ method: '+(POST|PUT|DELETE)', url: '**/workspace/**' }, (request) => {
      writes.push(request.url);
    });
    visitWithLiveWorkspaceSession(
      `/canvas?authority=dbt-project-files&canvasId=${CANVAS_ID}&projectRoot=${PROJECT_ROOT}`,
      {
        onBeforeLoad(window) {
          window.localStorage.setItem(
            'dvt-web-application-language',
            JSON.stringify({ state: { language: 'en' }, version: 0 })
          );
        },
      }
    );
    cy.get('[data-element-id="model.analytics.orders"]', { timeout: 60_000 }).should(
      'have.prop',
      'draggable',
      true
    );
    cy.get('.react-flow__node')
      .should('have.length.greaterThan', 0)
      .its('length')
      .as('definitionCardCount');
    placeCatalogueResource('source.analytics.raw.orders', 0);
    placeCatalogueResource('source.analytics.raw.orders', 1);
    placeCatalogueResource('model.analytics.orders', 2);
    placeCatalogueResource('model.analytics.orders', 3);
    cy.window().should((window) => {
      expect(readSavedPlacements(window)).to.have.length(4);
    });
    cy.window().then((window) => {
      const placed = readSavedPlacements(window);
      expect(new Set(placed.map((entry) => entry.id)).size).to.equal(4);
      cy.wrap(placed).as('resourceInstances');
    });
    cy.get<number>('@definitionCardCount').then((count) => {
      cy.get('.react-flow__node').should('have.length', count + 4);
    });
    cy.reload();
    cy.get<ResourcePlacement[]>('@resourceInstances').then((instances) => {
      for (const instance of instances)
        cy.get(`.react-flow__node[data-id="${instance.id}"]`, { timeout: 60_000 }).should('exist');
      const instance = instances.find((entry) => entry.resourceId === 'model.analytics.orders')!;
      cy.get(`.react-flow__node[data-id="${instance.id}"]`)
        .find('[data-slot="graph-node-card-title"]')
        .click();
      cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should(
        'be.visible'
      );
      cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
      cy.get('[data-slot="workspace-file-code-editor"]').should(
        'have.attr',
        'data-file-path',
        `${PROJECT_ROOT}/models/orders.sql`
      );
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
      cy.get(`.react-flow__node[data-id="${instance.id}"]`)
        .find('[data-slot="graph-node-card-title"]')
        .rightclick();
      cy.get('[data-slot="canvas-node-context-menu"]')
        .contains('[role="menuitem"]', 'Delete')
        .click();
      cy.get(`.react-flow__node[data-id="${instance.id}"]`).should('not.exist');
      cy.get('.react-flow__node[data-id="model.analytics.orders"]').should('exist');
      for (const sibling of instances.filter((entry) => entry.id !== instance.id))
        cy.get(`.react-flow__node[data-id="${sibling.id}"]`).should('exist');
    });
    cy.reload();
    cy.get<number>('@definitionCardCount').then((count) => {
      cy.get('.react-flow__node', { timeout: 60_000 }).should('have.length', count + 3);
    });
    cy.window().should((window) => {
      expect(readSavedPlacements(window)).to.have.length(3);
    });
    for (const [path, content] of Object.entries(PROJECT_FILES)) {
      readLiveWorkspaceFile(path).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('content', content);
      });
    }
    cy.then(() => {
      expect(writes, 'placement only persists local references').to.deep.equal([]);
    });
  });

  it('opens an imported model in Code while retaining the native Canvas without copying it', () => {
    const writes: string[] = [];
    cy.intercept({ method: '+(POST|PUT|DELETE)', url: '**/workspace/**' }, (request) => {
      writes.push(request.url);
    });
    visitWithLiveWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').should(
      'have.attr',
      'aria-expanded',
      'true'
    );
    cy.get('[data-slot="shell-file-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    cy.get(
      `[data-slot="canvas-code-workspace-surface"] [data-workspace-path="${PROJECT_ROOT}/models/orders.sql"]`
    )
      .should('be.visible')
      .and('have.length', 1)
      .click();
    cy.location('search').should('eq', '');
    cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get(
      '[data-slot="canvas-code-workspace-surface"] [data-slot="workspace-file-code-editor"]'
    ).should('have.attr', 'data-file-path', `${PROJECT_ROOT}/models/orders.sql`);
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').should(
      'have.attr',
      'aria-expanded',
      'true'
    );
    cy.get('.react-flow__node[data-id="model.analytics.orders"]').should('not.exist');
    cy.then(() => {
      expect(writes, 'navigation does not persist copied semantics').to.deep.equal([]);
    });
  });

  it('keeps invalid projects file-authoritative and reports the analyzer diagnostic', () => {
    seedLiveWorkspaceFiles({
      [`${INVALID_PROJECT_ROOT}/dbt_project.yml`]: INVALID_PROJECT_CONFIG.replace(
        "model-paths: ['../outside-project']",
        "model-paths: ['models']"
      ),
    })
      .then(() => adoptLiveDbtProjectFileAuthority(INVALID_PROJECT_ROOT, INVALID_CANVAS_ID))
      .then(() =>
        replaceLiveWorkspaceFile(`${INVALID_PROJECT_ROOT}/dbt_project.yml`, INVALID_PROJECT_CONFIG)
      );
    const observedRequests: string[] = [];
    cy.intercept('GET', '**/workspace/dbt/graph?*', (request) => {
      observedRequests.push(request.url);
    });
    visitWithLiveWorkspaceSession(
      `/canvas?authority=dbt-project-files&canvasId=${INVALID_CANVAS_ID}&projectRoot=${INVALID_PROJECT_ROOT}`,
      {
        onBeforeLoad(window) {
          window.localStorage.setItem(
            'dvt-web-application-language',
            JSON.stringify({ state: { language: 'en' }, version: 0 })
          );
        },
      }
    );

    cy.get('[data-slot="dbt-project-file-projection-notice"]', { timeout: 60_000 })
      .should('be.visible')
      .and('contain.text', 'dbt project analysis is unavailable')
      .and('contain.text', 'dbt_project_invalid');
    cy.get('.react-flow__node').should('not.exist');
    cy.location('search').should('contain', 'authority=dbt-project-files');
    cy.wrap(null).should(() => {
      expect(observedRequests.some((url) => url.includes('/workspace/dbt/graph?'))).to.equal(true);
    });
    cy.window().should((window) => {
      expect(
        window.performance
          .getEntriesByType('resource')
          .some((entry) => entry.name.includes('/workspace/graph/draft')),
        'no graph-draft request during file-authoritative rendering'
      ).to.equal(false);
    });
  });
});
