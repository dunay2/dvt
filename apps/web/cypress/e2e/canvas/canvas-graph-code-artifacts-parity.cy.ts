import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { clickButtonNatively } from '../../support/canvasExecutionSelection';
import {
  getE2eApiCalls,
  getLastE2eApiCall,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas graph to Code and Artifacts project-source parity', () => {
  let savedWorkflowSource: string | null = null;

  beforeEach(() => {
    savedWorkflowSource = null;

    stubShellBootstrapApis({
      scopes: [
        'workspace:graph-draft:view',
        'workspace:graph-draft:save',
        'workspace:files:save',
        'workspace:files:view',
        'plan:preview',
      ],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '1.0.0',
      plugins: {
        dbt: { available: true },
        dvt: { available: true },
      },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      effectiveWorkspace: E2E_WORKSPACE_SESSION,
      availableWorkspaces: [E2E_WORKSPACE_SESSION],
    });
    stubCanvasDraftRead();

    stubE2eApi('GET', '/workspace/files', ({ url }) => {
      expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
        tenantId: E2E_WORKSPACE_SESSION.tenantId,
        projectId: E2E_WORKSPACE_SESSION.projectId,
        environmentId: E2E_WORKSPACE_SESSION.environmentId,
      });

      return {
        body: [
          {
            path: 'pipelines',
            name: 'pipelines',
            kind: 'directory',
            children:
              savedWorkflowSource == null
                ? []
                : [
                    {
                      path: 'pipelines/sales_pipeline.yaml',
                      name: 'sales_pipeline.yaml',
                      kind: 'file',
                    },
                  ],
          },
          {
            path: 'models',
            name: 'models',
            kind: 'directory',
            children: [
              {
                path: 'models/analytics',
                name: 'analytics',
                kind: 'directory',
                children: [
                  {
                    path: 'models/analytics/model_orders.sql',
                    name: 'model_orders.sql',
                    kind: 'file',
                  },
                ],
              },
            ],
          },
        ],
      };
    });

    stubE2eApi('GET', '/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', () => ({
      body: {
        path: 'models/analytics/model_orders.sql',
        name: 'model_orders.sql',
        language: 'sql',
        content: 'select *\nfrom raw.orders',
        lastModified: '2026-04-08T00:00:00.000Z',
      },
    }));

    stubE2eApi('POST', '/workspace/files/pipelines%2Fsales_pipeline.yaml', ({ body, url }) => {
      expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
        tenantId: E2E_WORKSPACE_SESSION.tenantId,
        projectId: E2E_WORKSPACE_SESSION.projectId,
        environmentId: E2E_WORKSPACE_SESSION.environmentId,
      });
      expect(body).to.have.property('content');

      savedWorkflowSource = String((body as { content: unknown }).content);
      expect(savedWorkflowSource).to.contain('id: "src_orders"');
      expect(savedWorkflowSource).to.contain('id: "model_orders"');
      expect(savedWorkflowSource).to.contain('id: "orders_dashboard"');
      expect(savedWorkflowSource).to.contain('entrypoint: "models/analytics/model_orders.sql"');

      return {
        body: {
          path: 'pipelines/sales_pipeline.yaml',
          name: 'sales_pipeline.yaml',
          language: 'yaml',
          content: savedWorkflowSource,
          lastModified: '2026-05-25T00:00:00.000Z',
        },
      };
    });

    stubE2eApi('GET', '/workspace/files/pipelines%2Fsales_pipeline.yaml', () => {
      if (savedWorkflowSource == null) {
        return {
          statusCode: 404,
          body: {
            error: {
              type: 'not_found',
              reason: 'workspace_file_not_found',
              message: 'Workflow source has not been saved yet.',
            },
          },
        };
      }

      return {
        body: {
          path: 'pipelines/sales_pipeline.yaml',
          name: 'sales_pipeline.yaml',
          language: 'yaml',
          content: savedWorkflowSource,
          lastModified: '2026-05-25T00:00:00.000Z',
        },
      };
    });

    stubE2eJsonApi('POST', '/plans/preview', {
      previewProfile: 'transformation-sql-first-v1',
      plan: {
        metadata: {
          planVersion: '1.0',
          schemaVersion: '1.0',
          contractVersion: '1.0.0',
          inputHashSha256: 'a'.repeat(64),
          planId: 'b'.repeat(64),
          createdAtIso: '2026-05-25T00:00:00.000Z',
        },
        steps: [
          {
            stepId: 'src_orders',
            kind: 'PREPARE_POSTGRES_TRANSFORM',
            dependsOn: [],
            stepTypeConfig: {
              targetSchema: 'analytics',
              sourceSchema: 'raw',
              sourceTable: 'orders',
              sourceAlias: 'orders',
            },
          },
          {
            stepId: 'model_orders',
            kind: 'POSTGRES_SQL_TRANSFORM',
            dependsOn: ['src_orders'],
            stepTypeConfig: {
              dialect: 'postgres',
              entrypoint: 'models/analytics/model_orders.sql',
              sql: 'select * from raw.orders',
              sqlArtifact: {
                repo: 'dunay2/dvt',
                path: 'models/analytics/model_orders.sql',
                ref: 'refs/heads/main',
                commitSha: 'local',
                contentSha256: 'a'.repeat(64),
              },
              sourceSchema: 'raw',
              sourceTable: 'orders',
              sourceAlias: 'orders',
              sinkSchema: 'analytics',
              sinkTable: 'orders_daily',
              materialization: 'table',
              writeMode: 'replace',
            },
          },
          {
            stepId: 'orders_dashboard',
            kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
            dependsOn: ['model_orders'],
            stepTypeConfig: {
              sinkSchema: 'analytics',
              sinkTable: 'orders_daily',
              materialization: 'table',
              writeMode: 'replace',
            },
          },
        ],
        observability: {
          tags: {
            adapter: 'temporal',
            environmentId: 'e2e-env',
          },
        },
      },
      planRef: {
        uri: `dvt://plans/${'b'.repeat(64)}`,
        sha256: 'f'.repeat(64),
        schemaVersion: '1.0',
        planId: 'b'.repeat(64),
        planVersion: 'v1',
      },
      planSummary: {
        executor: 'postgres',
        nodeCount: 3,
        stepCount: 3,
        sourceTables: ['raw.orders'],
        sinkTables: ['analytics.orders_daily'],
      },
      persisted: {
        planRecordId: 'b'.repeat(64),
        canonicalPlanSha256: 'f'.repeat(64),
      },
      validation: {
        valid: true,
        warnings: [],
      },
      provenance: {
        graphArtifact: {
          repo: 'dunay2/dvt',
          path: 'pipelines/sales_pipeline.yaml',
          ref: 'refs/heads/main',
          commitSha: 'local',
          contentSha256: 'f'.repeat(64),
        },
        sqlArtifact: {
          repo: 'dunay2/dvt',
          path: 'models/analytics/model_orders.sql',
          ref: 'refs/heads/main',
          commitSha: 'local',
          contentSha256: 'a'.repeat(64),
        },
      },
    });
  });

  it('shows the workflow source planned in Grafo as the same Code file and Artifacts preview', () => {
    cy.viewport(1500, 900);

    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.contains('.react-flow__node', 'src_orders').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'orders_dashboard').should('be.visible');

    clickButtonNatively('Plan');
    waitForE2eApiCall('/workspace/files/pipelines%2Fsales_pipeline.yaml', 'POST');
    waitForE2eApiCall('/plans/preview', 'POST');
    cy.contains('Execution Plan Preview').should('be.visible');
    cy.get('body').type('{esc}', { force: true });
    cy.contains('Execution Plan Preview').should('not.exist');
    cy.wrap(null).should(() => {
      const saveCall = getLastE2eApiCall(
        '/workspace/files/pipelines%2Fsales_pipeline.yaml',
        'POST'
      );
      expect(saveCall?.body).to.have.property('content');
      expect(String((saveCall?.body as { content: unknown }).content)).to.contain(
        'id: "model_orders"'
      );
    });

    cy.get('[data-slot="canvas-workbench-tab-strip"]').within(() => {
      cy.contains('button', /^(Code|Codigo)$/).click();
    });
    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall('/workspace/files/pipelines%2Fsales_pipeline.yaml', 'GET');
    cy.location('pathname').should('eq', '/canvas/code');
    cy.contains('sales_pipeline.yaml').should('be.visible');
    cy.contains('id: "model_orders"').should('be.visible');
    cy.contains('entrypoint: "models/analytics/model_orders.sql"').should('be.visible');
    cy.wrap(null).should(() => {
      expect(savedWorkflowSource).to.contain('id: "src_orders"');
      expect(savedWorkflowSource).to.contain('id: "model_orders"');
      expect(savedWorkflowSource).to.contain('id: "orders_dashboard"');
      expect(savedWorkflowSource).to.contain('entrypoint: "models/analytics/model_orders.sql"');
    });

    cy.get('[data-slot="canvas-workbench-tab-strip"]').within(() => {
      cy.contains('button', /^(Artifacts|Artefactos)$/).click();
    });
    cy.location('pathname').should('eq', '/canvas/artifacts');
    cy.contains('Workflow pipeline').should('exist');
    cy.contains('pipelines/sales_pipeline.yaml').should('exist');
    cy.contains('models/analytics/model_orders.sql').should('exist');
    cy.contains('id: "model_orders"').should('exist');
    cy.wrap(null).should(() => {
      expect(
        getE2eApiCalls('/workspace/files/pipelines%2Fsales_pipeline.yaml', 'GET')
      ).to.have.length.greaterThan(0);
    });
  });
});
