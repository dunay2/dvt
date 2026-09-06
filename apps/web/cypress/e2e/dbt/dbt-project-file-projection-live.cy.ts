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
import {
  hasLiveProtectedRuntimeEnv,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

const PROJECT_ROOT = 'analytics';
const INVALID_PROJECT_ROOT = 'analytics-invalid';
const CANVAS_ID = 'analytics-files';
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
  [`${INVALID_PROJECT_ROOT}/dbt_project.yml`]: `
name: analytics_invalid
version: '1.0.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['models']
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
    const rect = $node[0].getBoundingClientRect();
    const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const middle = { x: start.x + 30, y: start.y + 24 };
    const end = { x: start.x + 110, y: start.y + 78 };

    cy.window().then((window) => {
      dispatchDragEvent($node[0], window, 'mousedown', start, 1);
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

describe('dbt project file projection live vertical', () => {
  before(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
      return;
    }

    return seedLiveWorkspaceFiles(PROJECT_FILES)
      .then(() => adoptLiveDbtProjectFileAuthority(PROJECT_ROOT, CANVAS_ID))
      .then(() => adoptLiveDbtProjectFileAuthority(INVALID_PROJECT_ROOT, INVALID_CANVAS_ID))
      .then(() =>
        replaceLiveWorkspaceFile(`${INVALID_PROJECT_ROOT}/dbt_project.yml`, INVALID_PROJECT_CONFIG)
      );
  });

  it('projects real dbt files without draft semantics and remains inspectable', () => {
    const observedRequests: string[] = [];
    cy.intercept('GET', '**/workspace/dbt/graph?*', (request) => {
      observedRequests.push(request.url);
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

    cy.get('.react-flow__node[data-id="model.analytics.orders"]').then(($node) => {
      const rect = $node[0].getBoundingClientRect();
      cy.wrap({ left: rect.left, top: rect.top }).as('originalModelPosition');
    });
    dragNode('model.analytics.orders');
    cy.get<Record<string, number>>('@originalModelPosition').then((original) => {
      cy.get('.react-flow__node[data-id="model.analytics.orders"]').should(($node) => {
        const rect = $node[0].getBoundingClientRect();
        expect(
          Math.abs(rect.left - original.left) + Math.abs(rect.top - original.top)
        ).to.be.greaterThan(20);
      });
    });
    cy.get('.react-flow__node[data-id="model.analytics.orders"]').then(($node) => {
      const transform = new DOMMatrix($node[0].style.transform);
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
          const transform = new DOMMatrix($node[0].style.transform);
          expect(transform.m41, 'restored Canvas x').to.be.closeTo(settled.x, 0.001);
          expect(transform.m42, 'restored Canvas y').to.be.closeTo(settled.y, 0.001);
        }
      );
    });

    // Enter the node once: Properties opens with Code as the preferred section.
    cy.get('.react-flow__node[data-id="model.analytics.orders"]')
      .find('[data-slot="graph-node-card-title"]')
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-tab-code"]')
      .should('be.visible')
      .and('have.attr', 'aria-selected', 'true');

    // The authoritative file is edited directly inside Properties Code.
    cy.get('[data-slot="workspace-file-code-editor"]', { timeout: 30_000 })
      .should('be.visible')
      .and('have.attr', 'data-file-path', `${PROJECT_ROOT}/models/orders.sql`);
    cy.get('[data-testid="monaco-code-editor"]', { timeout: 30_000 })
      .find('.view-lines')
      .invoke('text')
      .should((editorText) => {
        expect(editorText.replaceAll('\u00a0', ' ')).to.match(
          /source\(\s*'raw'\s*,\s*'orders'\s*\)/
        );
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

  it('keeps invalid projects file-authoritative and reports the analyzer diagnostic', () => {
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
