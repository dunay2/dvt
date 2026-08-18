/**
 * Owned concern: prove file-authoritative dbt Preview and Run through the real
 * browser, protected API, persisted plan, Temporal worker, and dbt CLI.
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
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

const PROJECT_ROOT = 'analytics-run';
const CANVAS_ID = 'analytics-run-files';
const MODEL_UNIQUE_ID = 'model.analytics_run.orders';
const SUMMARY_MODEL_UNIQUE_ID = 'model.analytics_run.order_summary';
const SOURCE_UNIQUE_ID = 'source.analytics_run.raw.orders';

const PROJECT_FILES: Readonly<Record<string, string>> = {
  [`${PROJECT_ROOT}/dbt_project.yml`]: `
name: analytics_run
version: '0.1.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['models']
clean-targets: ['target', 'dbt_packages']
`,
  [`${PROJECT_ROOT}/models/schema.yml`]: `
version: 2
sources:
  - name: raw
    schema: raw
    tables:
      - name: orders
        description: Governed live order intake
        columns:
          - name: order_id
            data_type: integer
          - name: customer
            data_type: text
          - name: amount
            data_type: numeric
models:
  - name: orders
    description: File-authoritative curated orders
    columns:
      - name: order_id
        data_type: integer
        tests:
          - not_null
          - unique
      - name: customer
        data_type: text
      - name: amount
        data_type: numeric
  - name: order_summary
    description: Downstream order totals used to prove dependency closure
`,
  [`${PROJECT_ROOT}/models/orders.sql`]: `
{{ config(materialized='view') }}

select order_id, customer, amount
from {{ source('raw', 'orders') }}
`,
  [`${PROJECT_ROOT}/models/order_summary.sql`]: `
{{ config(materialized='view') }}

select count(*) as order_count, sum(amount) as gross_amount
from {{ ref('orders') }}
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

function waitForCompletedDbtRun(runId: string, attempt = 0): Cypress.Chainable<LiveRunSnapshot> {
  return readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    const snapshot = response.body as LiveRunSnapshot;
    const status = snapshot.status.toLowerCase();

    if (status === 'completed') {
      return cy.wrap(snapshot, { log: false });
    }
    if (status === 'failed') {
      throw new Error(`Live dbt run ${runId} failed before completion.`);
    }
    if (attempt >= 120) {
      throw new Error(`Timed out waiting for live dbt run ${runId} to complete.`);
    }

    return cy.wait(500).then(() => waitForCompletedDbtRun(runId, attempt + 1));
  });
}

function selectResourceForExecution(uniqueId: string): void {
  cy.get(`.react-flow__node[data-id="${uniqueId}"]`, { timeout: 60_000 })
    .should('be.visible')
    .within(() => {
      cy.get('button[aria-label="Select for execution"]')
        .should('be.visible')
        .should('be.enabled')
        .click();
      cy.get('button[aria-label="Deselect for execution"]').should('be.visible');
    });
}

function visitProjectWithRequestObservations(observedRequests: ObservedRequest[]): void {
  cy.viewport(1500, 900);
  visitWithLiveWorkspaceSession(
    `/canvas?authority=dbt-project-files&canvasId=${CANVAS_ID}&projectRoot=${PROJECT_ROOT}`,
    {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
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

describe('dbt project file Preview and Run live vertical', () => {
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

  it('runs the selected model from the exact analyzed project revision without regeneration', () => {
    const observedRequests: ObservedRequest[] = [];

    requestLiveDbtProjectGraph(PROJECT_ROOT, CANVAS_ID).then((response) => {
      const projection = response.body as {
        freshness: string;
        projectRevision: { contentSetSha256: string; dbtVersion?: string };
        analysisSha256: string;
        executionTarget?: {
          provider: string;
          adapter: string;
          targetName: string;
          connectionRef: {
            schemaVersion: string;
            connectionId: string;
            provider: string;
          };
          resolutionSource: string;
        };
        capabilities: { canPreview: boolean; canRun: boolean };
      };

      expect(response.status).to.equal(200);
      expect(projection.freshness).to.equal('fresh');
      expect(projection.projectRevision.contentSetSha256).to.match(/^[a-f0-9]{64}$/);
      expect(projection.projectRevision.dbtVersion).to.be.a('string').and.not.to.equal('');
      expect(projection.analysisSha256).to.match(/^[a-f0-9]{64}$/);
      expect(projection.executionTarget).to.deep.include({
        provider: 'temporal',
        adapter: 'postgres',
        targetName: 'analysis',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'local-postgres-proof',
          provider: 'postgres',
        },
        resolutionSource: 'environment-default',
      });
      expect(projection.capabilities).to.deep.include({ canPreview: true, canRun: true });
    });

    visitProjectWithRequestObservations(observedRequests);

    cy.get(`.react-flow__node[data-id="${SOURCE_UNIQUE_ID}"]`, {
      timeout: 60_000,
    })
      .should('be.visible')
      .and('contain.text', 'Orders');
    cy.get(`.react-flow__node[data-id="${MODEL_UNIQUE_ID}"]`)
      .should('be.visible')
      .and('contain.text', 'Orders');
    cy.get(
      `.react-flow__node[data-id="${MODEL_UNIQUE_ID}"] [data-slot="canvas-node-shell"]`
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-general"]', { timeout: 20_000 })
      .should('be.visible')
      .click();
    cy.get('[data-slot="dbt-execution-target-binding"]')
      .should('be.visible')
      .and('contain.text', 'analysis')
      .and('contain.text', 'postgres / local-postgres-proof')
      .and('contain.text', 'Environment default')
      .and('not.contain.text', 'DBT_PROFILES_DIR');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.get(`.react-flow__node[data-id="${SOURCE_UNIQUE_ID}"]`).within(() => {
      cy.get('button[aria-label="Select for execution"]').should('not.exist');
      cy.get('button[aria-label="Deselect for execution"]').should('not.exist');
    });
    cy.get(`.react-flow__node[data-id="${SUMMARY_MODEL_UNIQUE_ID}"]`)
      .should('be.visible')
      .and('contain.text', 'order_summary');
    selectResourceForExecution(SUMMARY_MODEL_UNIQUE_ID);

    clickPreviewExecutionPlanFromOperationalDrawer();

    cy.wrap(null, { timeout: 60_000 }).should(() => {
      const previewRequest = observedRequests.find(
        ({ method, url }) => method === 'POST' && url.includes('/plans/preview')
      );
      expect(previewRequest, JSON.stringify(previewRequest)).to.include({ status: 200 });
    });

    cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
      .should('be.visible')
      .within(() => {
        cy.contains('Execution Preview').should('be.visible');
        cy.get('[aria-label="Canvas value"]').should('have.text', CANVAS_ID);
        cy.get('[aria-label="Project root value"]').should('have.text', PROJECT_ROOT);
        cy.get('[aria-label="Project revision value"]')
          .invoke('text')
          .should('match', /[a-f0-9]{64}/);
        cy.get('[aria-label="Analysis revision value"]')
          .invoke('text')
          .should('match', /[a-f0-9]{64}/);
        cy.get('[aria-label="Requested resources value"]').should(
          'have.text',
          SUMMARY_MODEL_UNIQUE_ID
        );
        cy.get('[aria-label="Included dependencies value"]').should('have.text', MODEL_UNIQUE_ID);
        cy.get('[aria-label="Authorized execution scope value"]')
          .should('contain.text', MODEL_UNIQUE_ID)
          .and('contain.text', SUMMARY_MODEL_UNIQUE_ID);
        cy.get('[aria-label="Executor value"]').should('have.text', 'temporal');
        cy.get('[aria-label="Adapter value"]').should('have.text', 'postgres');
        cy.get('[aria-label="Target value"]').should('have.text', 'analysis');
        cy.get('[aria-label="Connection value"]').should(
          'have.text',
          'postgres / local-postgres-proof'
        );
        cy.get('[aria-label="Resolved by value"]').should('have.text', 'Environment default');
        cy.root().should('not.contain.text', 'DBT_PROFILES_DIR');
      });
    cy.wrap(null).should(() => {
      expect(
        observedRequests.some(
          ({ method, url }) => method === 'POST' && url.includes('/plans/preview')
        )
      ).to.equal(true);
      expect(
        observedRequests.some(
          ({ method, url }) => method !== 'GET' && url.includes('/workspace/files/')
        )
      ).to.equal(false);
      expect(observedRequests.some(({ url }) => url.includes('/workspace/graph/draft'))).to.equal(
        false
      );
    });

    clickButtonNatively('Start Run');

    cy.location('pathname', { timeout: 30_000 }).should('match', /^\/runs\/[^/]+$/);
    cy.location('pathname').then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.to.equal('');

      return waitForCompletedDbtRun(runId!).then((snapshot) => {
        expect(snapshot.status.toLowerCase()).to.equal('completed');
        expect(snapshot.provenance?.persistedPlan?.sourceRef).to.match(/^dvt-plan:\/\//);

        return readLiveRunEvents(runId!).then((eventsResponse) => {
          expect(eventsResponse.status).to.equal(200);
          const events = (eventsResponse.body as LiveRunEvents).items ?? [];
          const eventTypes = events.map(({ eventType }) => eventType);
          expect(eventTypes).to.include.members([
            'RunQueued',
            'RunStarted',
            'StepCompleted',
            'RunCompleted',
          ]);
          expect(
            events.some(
              ({ eventType, stepId }) => eventType === 'StepCompleted' && stepId === MODEL_UNIQUE_ID
            )
          ).to.equal(true);
          expect(
            events.some(
              ({ eventType, stepId }) =>
                eventType === 'StepCompleted' && stepId === SUMMARY_MODEL_UNIQUE_ID
            )
          ).to.equal(true);
        });
      });
    });

    cy.reload();
    cy.contains('Runtime snapshot', { timeout: 30_000 }).should('be.visible');
    cy.get('[data-slot="run-plan-provenance-card"]', { timeout: 30_000 })
      .scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Execution Preview and authoring provenance')
      .and('contain.text', 'dvt-plan://')
      .and('not.contain.text', 'DBT_PROFILES_DIR');
    cy.get('[data-slot="run-plan-record-value"]').should(($value) => {
      expect($value[0]?.scrollWidth).to.be.at.most($value[0]?.clientWidth ?? 0);
    });
  });

  it('does not present a DBT source as an executable selection root', () => {
    const observedRequests: ObservedRequest[] = [];
    visitProjectWithRequestObservations(observedRequests);

    cy.get(`.react-flow__node[data-id="${SOURCE_UNIQUE_ID}"]`, { timeout: 60_000 })
      .should('be.visible')
      .within(() => {
        cy.get('button[aria-label="Select for execution"]').should('not.exist');
        cy.get('button[aria-label="Deselect for execution"]').should('not.exist');
      });
    cy.get(`.react-flow__node[data-id="${MODEL_UNIQUE_ID}"]`).within(() => {
      cy.get('button[aria-label="Select for execution"]').should('be.visible').and('be.enabled');
    });

    cy.wrap(null).should(() => {
      expect(
        observedRequests.some(
          ({ method, url }) => method === 'POST' && url.includes('/plans/preview')
        )
      ).to.equal(false);
    });
  });
});
