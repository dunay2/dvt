/**
 * Owned concern: prove the governed dbt YAML description transaction through
 * protected HTTP, file authority, project analysis, Preview, Run, and reopen.
 */
import {
  clickButtonNatively,
  clickPreviewExecutionPlanFromOperationalDrawer,
} from '../../support/canvasExecutionSelection';
import {
  adoptLiveDbtProjectFileAuthority,
  requestLiveDbtProjectGraph,
  seedLiveWorkspaceFiles,
} from '../../support/dbtProjectLive';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunEvents,
  readLiveRunSnapshot,
  readLiveWorkspaceFile,
  visitWithLiveWorkspaceSession,
  waitForLiveWorkspaceFileContent,
} from '../../support/liveProtectedRuntime';

const PROJECT_ROOT = 'analytics-description-edit';
const CANVAS_ID = 'analytics-description-edit-files';
const MODEL_UNIQUE_ID = 'model.analytics_description_edit.orders';
const SCHEMA_PATH = `${PROJECT_ROOT}/models/schema.yml`;
const MODEL_SQL_PATH = `${PROJECT_ROOT}/models/orders.sql`;
const ORIGINAL_DESCRIPTION = 'Curated orders model';
const REVERT_PROOF_DESCRIPTION = 'Curated orders with governed ownership';
const RUN_DESCRIPTION = 'Curated orders approved for downstream reporting';
const UPDATED_MODEL_SQL = `select 1::integer as order_id
-- edited through the node Code workbench`;
const INVALID_MODEL_SQL = `select * from {{ ref('orders') }
-- intentionally invalid until the user corrects it`;

const SCHEMA_CONTENT = `version: 2
# This comment and the unrelated resource must survive focused edits.
models:
  - name: orders
    description: ${ORIGINAL_DESCRIPTION}
    tags: [finance, governed]
    columns:
      - name: order_id
        data_type: integer
        tests:
          - not_null
  - name: untouched_model
    description: This resource must remain byte-for-byte unchanged
`;

const PROJECT_FILES: Readonly<Record<string, string>> = {
  [`${PROJECT_ROOT}/dbt_project.yml`]: `name: analytics_description_edit
version: '0.4.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['models']
clean-targets: ['target', 'dbt_packages']
`,
  [SCHEMA_PATH]: SCHEMA_CONTENT,
  [MODEL_SQL_PATH]: `{{ config(materialized='view') }}

select 1::integer as order_id
`,
  [`${PROJECT_ROOT}/models/untouched_model.sql`]: `select 2::integer as untouched_id
`,
};

type ObservedRequest = {
  method: string;
  url: string;
  status?: number;
  responseBody?: string;
};

type LiveRunSnapshot = Readonly<{
  runId: string;
  status: string;
  provenance?: Readonly<{
    persistedPlan?: Readonly<{ sourceRef?: string }>;
  }>;
}>;

type LiveRunEvents = Readonly<{
  items?: ReadonlyArray<Readonly<{ eventType?: string; stepId?: string }>>;
}>;

function visitProject(observedRequests: ObservedRequest[]): void {
  cy.viewport(1500, 900);
  visitWithLiveWorkspaceSession(
    `/canvas?authority=dbt-project-files&canvasId=${CANVAS_ID}&projectRoot=${PROJECT_ROOT}`,
    {
      onBeforeLoad(window) {
        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, init) => {
          const request = input instanceof window.Request ? input : undefined;
          const observation: ObservedRequest = {
            method: (init?.method ?? request?.method ?? 'GET').toUpperCase(),
            url: typeof input === 'string' ? input : (request?.url ?? input.toString()),
          };
          observedRequests.push(observation);
          return originalFetch(input, init).then(async (response) => {
            observation.status = response.status;
            if (!response.ok) observation.responseBody = await response.clone().text();
            return response;
          });
        };
      },
    }
  );
}

function openModelWorkbench(): void {
  cy.get(`.react-flow__node[data-id="${MODEL_UNIQUE_ID}"]`, { timeout: 60_000 })
    .should('be.visible')
    .find('[data-slot="canvas-node-shell"]')
    .dblclick();
  cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
  cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');
  cy.get('[data-slot="canvas-node-workbench-tab-code"]')
    .should('be.visible')
    .and('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
  cy.get('[data-slot="dbt-yaml-description-editor"]', { timeout: 20_000 }).should('be.visible');
}

function openModelCodeEditor(): void {
  cy.get(`.react-flow__node[data-id="${MODEL_UNIQUE_ID}"]`, { timeout: 60_000 })
    .should('be.visible')
    .find('[data-slot="canvas-node-shell"]')
    .dblclick();
  cy.get('[data-slot="canvas-node-workbench-tab-code"]')
    .should('be.visible')
    .and('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-node-workbench-open-code-editor"]').should('be.enabled').click();
}

function proveModelWorkbenchMovement(): void {
  cy.get('[data-slot="canvas-node-workbench-overlay"]').then(($overlay) => {
    const initial = $overlay[0]!.getBoundingClientRect();

    cy.get('[data-slot="canvas-node-workbench-drag-handle"]')
      .focus()
      .should('have.focus')
      .type('{leftarrow}{downarrow}');
    cy.get('[data-slot="canvas-node-workbench-overlay"]')
      .should(($movedOverlay) => {
        const moved = $movedOverlay[0]!.getBoundingClientRect();
        expect(moved.left).to.be.lessThan(initial.left);
        expect(moved.top).to.be.greaterThan(initial.top);
      })
      .then(($keyboardMovedOverlay) => {
        const keyboardMoved = $keyboardMovedOverlay[0]!.getBoundingClientRect();
        const pointerId = 41;

        cy.get('[data-slot="canvas-node-workbench-drag-handle"]').trigger('pointerdown', {
          button: 0,
          clientX: keyboardMoved.left + 40,
          clientY: keyboardMoved.top + 24,
          pointerId,
        });
        cy.get('[data-slot="canvas-node-workbench-overlay"]')
          .trigger('pointermove', {
            clientX: keyboardMoved.left - 24,
            clientY: keyboardMoved.top + 56,
            pointerId,
          })
          .trigger('pointerup', { pointerId })
          .should(($pointerMovedOverlay) => {
            const moved = $pointerMovedOverlay[0]!.getBoundingClientRect();
            const viewport = $pointerMovedOverlay[0]!.ownerDocument.defaultView;
            expect(moved.left).to.be.lessThan(keyboardMoved.left);
            expect(moved.top).to.be.greaterThan(keyboardMoved.top);
            expect(moved.left).to.be.at.least(0);
            expect(moved.top).to.be.at.least(0);
            expect(moved.right).to.be.at.most(viewport!.innerWidth);
            expect(moved.bottom).to.be.at.most(viewport!.innerHeight);
          });
      });
  });
}

function closeModelWorkbench(): void {
  cy.get('[data-slot="canvas-node-workbench-overlay"]')
    .find('[data-slot="canvas-node-workbench-close"]')
    .should('be.visible')
    .click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
}

function editAndApplyDescription(nextDescription: string): void {
  cy.get('[data-slot="dbt-yaml-description-input"]')
    .should('be.enabled')
    .clear()
    .type(nextDescription)
    .should('have.value', nextDescription);
  cy.get('[data-slot="dbt-yaml-description-review"]').should('be.enabled').click();
  cy.get('[data-slot="dbt-yaml-description-diff"]', { timeout: 30_000 })
    .should('be.visible')
    .and('contain.text', ORIGINAL_DESCRIPTION)
    .and('contain.text', nextDescription);
  cy.get('[data-slot="dbt-yaml-description-apply"]').should('be.enabled').click();
  cy.get('[data-slot="dbt-yaml-description-receipt"]', { timeout: 60_000 })
    .should('be.visible')
    .find('[data-full-value]')
    .should('have.length', 4)
    .each(($value) => {
      expect($value.attr('data-full-value')).to.match(/^[a-f0-9]{64}$/);
    });
}

function expectAuthoritativeDescription(expectedDescription: string): void {
  readLiveWorkspaceFile(SCHEMA_PATH).then((response) => {
    expect(response.status).to.equal(200);
    const content = String((response.body as { content?: unknown }).content ?? '');
    expect(content).to.contain(`description: ${expectedDescription}`);
    expect(content).to.contain(
      '# This comment and the unrelated resource must survive focused edits.'
    );
    expect(content).to.contain('description: This resource must remain byte-for-byte unchanged');
    expect(content).to.contain('tags: [finance, governed]');
  });

  requestLiveDbtProjectGraph(PROJECT_ROOT, CANVAS_ID).then((response) => {
    expect(response.status).to.equal(200);
    const nodes = (
      response.body as { nodes?: ReadonlyArray<{ uniqueId: string; description?: string }> }
    ).nodes;
    expect(nodes?.find(({ uniqueId }) => uniqueId === MODEL_UNIQUE_ID)?.description).to.equal(
      expectedDescription
    );
  });
}

function waitForCompletedRun(runId: string, attempt = 0): Cypress.Chainable<LiveRunSnapshot> {
  return readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    const snapshot = response.body as LiveRunSnapshot;
    const status = snapshot.status.toLowerCase();
    if (status === 'completed') return cy.wrap(snapshot, { log: false });
    if (status === 'failed') throw new Error(`Live dbt run ${runId} failed before completion.`);
    if (attempt >= 120) {
      throw new Error(`Timed out waiting for live dbt run ${runId} to complete.`);
    }
    return cy.wait(500).then(() => waitForCompletedRun(runId, attempt + 1));
  });
}

function closeContextualWorkbench(): void {
  cy.get('[data-slot="canvas-contextual-workbench-header"]').find('button').click();
  cy.get('[data-slot="canvas-contextual-workbench"]').should('not.exist');
}

function replaceOpenCodeContent(content: string): void {
  cy.get('[data-testid="monaco-code-editor"]').find('.view-lines').click({ force: true });
  cy.focused()
    .should(($editor) => {
      expect($editor.is('textarea, [contenteditable="true"]')).to.equal(true);
    })
    .type('{ctrl+a}{backspace}', { force: true, delay: 0 });
  cy.window().then((window) => {
    const clipboardData = new window.DataTransfer();
    clipboardData.setData('text/plain', content);
    cy.focused().trigger('paste', {
      clipboardData,
      force: true,
    });
  });
}

describe('dbt YAML description edit live vertical', () => {
  before(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
      return;
    }

    return seedLiveWorkspaceFiles(PROJECT_FILES).then(() =>
      adoptLiveDbtProjectFileAuthority(PROJECT_ROOT, CANVAS_ID)
    );
  });

  beforeEach(() => {
    resetE2eApiStubs();
  });

  it('applies, reverts, runs, and reopens one lossless file-authoritative edit', () => {
    const observedRequests: ObservedRequest[] = [];
    visitProject(observedRequests);

    openModelWorkbench();
    proveModelWorkbenchMovement();
    cy.get('[data-slot="dbt-yaml-description-input"]').should('have.value', ORIGINAL_DESCRIPTION);
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').should('be.visible');

    editAndApplyDescription(REVERT_PROOF_DESCRIPTION);
    expectAuthoritativeDescription(REVERT_PROOF_DESCRIPTION);
    cy.get('[data-slot="dbt-yaml-description-revert"]').should('be.enabled').click();
    cy.get('[data-slot="dbt-yaml-description-revert"]', { timeout: 60_000 }).should('not.exist');
    cy.get('[data-slot="dbt-yaml-description-receipt"]').should('not.exist');
    readLiveWorkspaceFile(SCHEMA_PATH).then((response) => {
      expect(response.status).to.equal(200);
      expect((response.body as { content: string }).content).to.equal(SCHEMA_CONTENT);
    });
    expectAuthoritativeDescription(ORIGINAL_DESCRIPTION);

    closeModelWorkbench();
    openModelWorkbench();
    cy.get('[data-slot="dbt-yaml-description-input"]').should('have.value', ORIGINAL_DESCRIPTION);
    editAndApplyDescription(RUN_DESCRIPTION);
    expectAuthoritativeDescription(RUN_DESCRIPTION);
    closeModelWorkbench();

    openModelCodeEditor();
    cy.get('[data-slot="canvas-contextual-workbench"]', { timeout: 30_000 }).should('be.visible');
    cy.get(
      `[data-slot="code-workspace-file-entry"][data-workspace-path="${MODEL_SQL_PATH}"]`
    ).should('be.visible');
    cy.get('[data-testid="monaco-code-editor"]', { timeout: 30_000 })
      .find('.view-lines')
      .invoke('text')
      .should((renderedCode) => {
        expect(renderedCode.replaceAll('\u00a0', ' ')).to.contain('select 1::integer as order_id');
      });
    replaceOpenCodeContent(INVALID_MODEL_SQL);
    waitForLiveWorkspaceFileContent(MODEL_SQL_PATH, INVALID_MODEL_SQL);
    cy.get('[data-slot="code-working-tree-status"]', { timeout: 60_000 }).should(
      'have.attr',
      'data-phase',
      'persisted_invalid'
    );

    replaceOpenCodeContent(UPDATED_MODEL_SQL);
    cy.get('[data-testid="monaco-code-editor"]')
      .find('.view-lines')
      .invoke('text')
      .should((renderedCode) => {
        expect(renderedCode.replaceAll('\u00a0', ' ')).to.contain(
          'edited through the node Code workbench'
        );
      });
    waitForLiveWorkspaceFileContent(MODEL_SQL_PATH, UPDATED_MODEL_SQL);
    cy.get('[data-slot="code-working-tree-status"]', { timeout: 60_000 }).should(
      'have.attr',
      'data-phase',
      'synchronized'
    );
    closeContextualWorkbench();
    closeModelWorkbench();

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]')
      .should('be.visible')
      .should(($command) => {
        expect($command.attr('data-disabled')).to.be.undefined;
      })
      .click();
    cy.get('[data-slot="canvas-contextual-workbench"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', PROJECT_ROOT);
    cy.get(`[data-slot="code-workspace-file-entry"][data-workspace-path="${SCHEMA_PATH}"]`).should(
      'be.visible'
    );
    cy.get(
      `[data-slot="code-workspace-file-entry"][data-workspace-path="${MODEL_SQL_PATH}"]`
    ).should('be.visible');
    closeContextualWorkbench();

    cy.get(`.react-flow__node[data-id="${MODEL_UNIQUE_ID}"]`).within(() => {
      cy.get('button[aria-label="Select for execution"]').should('be.enabled').click();
      cy.get('button[aria-label="Deselect for execution"]').should('be.visible');
    });
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wrap(null, { timeout: 60_000 }).should(() => {
      const previewRequest = observedRequests.find(
        ({ method, url }) => method === 'POST' && url.includes('/plans/preview')
      );
      expect(previewRequest?.status, previewRequest?.responseBody).to.equal(200);
    });
    cy.get('[data-testid="plan-preview-modal"]', { timeout: 60_000 })
      .should('be.visible')
      .within(() => {
        cy.get('[aria-label="Canvas value"]').should('have.text', CANVAS_ID);
        cy.get('[aria-label="Requested resources value"]').should('have.text', MODEL_UNIQUE_ID);
        cy.get('[aria-label="Project root value"]').should('have.text', PROJECT_ROOT);
      });
    clickButtonNatively('Start Run');

    cy.location('pathname', { timeout: 30_000 }).should('match', /^\/runs\/[^/]+$/);
    cy.location('pathname').then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.to.equal('');
      return waitForCompletedRun(runId!).then((snapshot) => {
        expect(snapshot.provenance?.persistedPlan?.sourceRef).to.match(/^dvt-plan:\/\//);
        return readLiveRunEvents(runId!).then((eventsResponse) => {
          expect(eventsResponse.status).to.equal(200);
          const events = (eventsResponse.body as LiveRunEvents).items ?? [];
          expect(
            events.some(
              ({ eventType, stepId }) => eventType === 'StepCompleted' && stepId === MODEL_UNIQUE_ID
            )
          ).to.equal(true);
          expect(events.some(({ eventType }) => eventType === 'RunCompleted')).to.equal(true);
        });
      });
    });

    visitProject(observedRequests);
    openModelWorkbench();
    cy.get('[data-slot="dbt-yaml-description-input"]').should('have.value', RUN_DESCRIPTION);
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').should('be.visible');
    expectAuthoritativeDescription(RUN_DESCRIPTION);
    closeModelWorkbench();
    openModelCodeEditor();
    cy.get('[data-slot="canvas-contextual-workbench"]', { timeout: 30_000 }).should('be.visible');
    cy.get('[data-testid="monaco-code-editor"]', { timeout: 30_000 })
      .find('.view-lines')
      .invoke('text')
      .should((renderedCode) => {
        expect(renderedCode.replaceAll('\u00a0', ' ')).to.contain(
          'edited through the node Code workbench'
        );
      });
    readLiveWorkspaceFile(MODEL_SQL_PATH).then((response) => {
      expect(response.status).to.equal(200);
      expect((response.body as { content: string }).content).to.equal(UPDATED_MODEL_SQL);
    });
    closeContextualWorkbench();
    closeModelWorkbench();

    cy.wrap(null).should(() => {
      const successfulPosts = (path: string): ObservedRequest[] =>
        observedRequests.filter(
          ({ method, status, url }) => method === 'POST' && status === 200 && url.includes(path)
        );
      expect(successfulPosts('/workspace/dbt/description-edits/proposals')).to.have.length(2);
      expect(successfulPosts('/workspace/dbt/description-edits/applications')).to.have.length(2);
      expect(successfulPosts('/workspace/dbt/description-edits/reverts')).to.have.length(1);
      expect(
        observedRequests.some(
          ({ method, status, url }) =>
            method === 'POST' && status === 200 && url.includes('/plans/preview')
        )
      ).to.equal(true);
      expect(observedRequests.some(({ url }) => url.includes('/workspace/graph/draft'))).to.equal(
        false
      );
    });
  });
});
