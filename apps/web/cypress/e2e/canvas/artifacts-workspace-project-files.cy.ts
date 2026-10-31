/** Owned concern: prove central Canvas Code exposes read-only workflow files without an Artifacts route. */
import {
  PublishGraphDbtWorkspaceArtifactsRequestSchema,
  CompileGraphDbtModelsRequestSchema,
  GraphDbtModelCompilationResultSchema,
  parsePlanPreviewRejectedOutcome,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import type { FileContent, WorkspaceFileEntry } from '../../../src/app/ports/workspace';
import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../../src/app/stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/canvasCopyCatalog';
import {
  stubCanvasDraftRead,
  stubStatefulCanvasDraftAuthoring,
} from '../../support/canvasDraftAuthoring';
import { clickPreviewExecutionPlanFromOperationalDrawer } from '../../support/canvasExecutionSelection';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const WORKFLOW_PROJECT_FILE_TREE = [
  {
    path: 'pipelines',
    name: 'pipelines',
    kind: 'directory',
    children: [
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
];

const PREVIEW_REJECTION_REASON = 'Selected dependency is unavailable in this workspace.';

function stubProjectCodeBootstrap(scopes: string[]): void {
  stubShellBootstrapApis({
    scopes,
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
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eApi('POST', /^\/workspace\/files\//, () => {
    throw new Error('Read-only project Code must not save workspace files.');
  });
}

function stubContextualProjectCodeApis(): void {
  stubProjectCodeBootstrap(['workspace:files:view']);
  stubCanvasDraftRead();
  stubE2eJsonApi('GET', '/workspace/files', WORKFLOW_PROJECT_FILE_TREE);
  stubE2eApi('GET', '/workspace/files/pipelines%2Fsales_pipeline.yaml', () => ({
    body: {
      path: 'pipelines/sales_pipeline.yaml',
      name: 'sales_pipeline.yaml',
      language: 'yaml',
      content: 'executionTarget: "postgres"\nentrypoint: "models/analytics/model_orders.sql"',
      lastModified: '2026-04-08T00:00:00.000Z',
    },
  }));
  stubE2eApi('GET', '/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', () => ({
    body: {
      path: 'models/analytics/model_orders.sql',
      name: 'model_orders.sql',
      language: 'sql',
      content: 'select *\nfrom raw.orders',
      lastModified: '2026-04-08T00:00:00.000Z',
    },
  }));
}

function stubProjectPublicationApis(compilation: 'invalid' | 'compiled'): void {
  stubProjectCodeBootstrap([
    'workspace:files:view',
    'workspace:graph-draft:view',
    'workspace:graph-draft:save',
    'plan:preview',
    'run:start',
  ]);
  const draft = stubStatefulCanvasDraftAuthoring({ dbtGraph: true, authoringGenerated: true });
  draft.nodes = draft.nodes.map((node) =>
    node.id === 'raw_orders'
      ? {
          ...node,
          metadata: {
            ...node.metadata,
            columns: [{ name: 'order_id', type: 'integer', nullable: false, primaryKey: true }],
          },
        }
      : node
  );
  const files = new Map<string, FileContent>();
  stubE2eApi('GET', '/workspace/files', () => {
    const entries: WorkspaceFileEntry[] = [...files.values()].map(({ path, name }) => ({
      path,
      name,
      kind: 'file',
    }));
    return {
      body: [
        ...entries.filter((entry) => !entry.path.startsWith('models/')),
        {
          path: 'models',
          name: 'models',
          kind: 'directory',
          children: entries.filter((entry) => entry.path.startsWith('models/')),
        },
      ],
    };
  });
  stubE2eApi('GET', /^\/workspace\/files\//, ({ url }) => {
    const path = decodeURIComponent(url.pathname.slice('/workspace/files/'.length));
    const file = files.get(path);
    return file
      ? { body: file }
      : {
          statusCode: 404,
          body: { error: { type: 'not_found', reason: 'workspace_file_not_found' } },
        };
  });
  stubE2eApi('POST', '/workspace/dbt/graph-artifacts/publications', ({ body }) => {
    const request = PublishGraphDbtWorkspaceArtifactsRequestSchema.parse(body);
    const writes = request.artifacts
      .filter((artifact) => artifact.writeRequired)
      .map((artifact) => {
        const contentSha256 = sha256HexUtf8(artifact.content);
        files.set(artifact.path, {
          path: artifact.path,
          name: artifact.path.split('/').at(-1)!,
          language: artifact.language,
          content: artifact.content,
          contentSha256,
          lastModified: '2026-10-23T00:00:00.000Z',
        });
        return { path: artifact.path, contentSha256 };
      });
    return {
      body: {
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'applied',
        idempotencyKey: request.idempotencyKey,
        requestHash: sha256HexUtf8(JSON.stringify(request)),
        deduplicated: false,
        writes,
      },
    };
  });
  stubE2eApi('POST', '/workspace/dbt/graph-artifacts/compiled-models', ({ body }) => {
    const request = CompileGraphDbtModelsRequestSchema.parse(body);
    return {
      body: GraphDbtModelCompilationResultSchema.parse(
        compilation === 'invalid'
          ? {
              schemaVersion: 'graph-dbt-model-compilation.v1',
              kind: 'invalid',
              canvasId: request.canvasId,
              diagnostics: [{ code: 'dbt_compile_failed', message: 'Unsafe compiler detail' }],
            }
          : {
              schemaVersion: 'graph-dbt-model-compilation.v1',
              kind: 'compiled',
              canvasId: request.canvasId,
              authorityBinding: {
                schemaVersion: 'canvas-authoring-authority-binding.v1',
                canvasId: request.canvasId,
                authority: { kind: 'graph-draft' },
              },
              projectRevision: {
                projectRoot: '.',
                projectName: 'analytics',
                contentSetSha256: 'a'.repeat(64),
                analyzedAt: '2026-10-24T00:00:00.000Z',
                analyzerVersion: 'dvt-dbt-analyzer.v1',
                dbtVersion: '1.10.0',
              },
              analysisSha256: 'b'.repeat(64),
              models: request.selectors
                .slice()
                .sort()
                .map((selector) => ({
                  selector,
                  uniqueId: `model.analytics.${selector}`,
                  compiledSql: `select * from ${selector}`,
                })),
            }
      ),
    };
  });
  if (compilation === 'compiled') {
    const details = parsePlanPreviewRejectedOutcome({
      contractVersion: '1.0.0',
      kind: 'selection-rejected',
      rejection: { code: 'REJECTED', cause: 'dependency_gap', reason: PREVIEW_REJECTION_REASON },
    });
    stubE2eJsonApi(
      'POST',
      '/plans/preview',
      { error: { type: 'unprocessable', reason: 'plan_rejected', details } },
      { statusCode: 422 }
    );
  }
  for (const path of compilation === 'compiled'
    ? ['/runs/start']
    : ['/plans/preview', '/runs/start']) {
    stubE2eJsonApi(
      'POST',
      path,
      { error: 'Unexpected submission after compilation rejection' },
      { statusCode: 500 }
    );
  }
}

describe('Central project Code workflow files', () => {
  it('shows workflow YAML and SQL files without opening a peer Artifacts workbench', () => {
    stubContextualProjectCodeApis();

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('[data-slot="shell-file-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();

    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall('/workspace/files/pipelines%2Fsales_pipeline.yaml', 'GET');

    cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-code-workspace-surface"]').should('be.visible');
    cy.get(
      '[data-slot="canvas-code-workspace-surface"] [data-workspace-path="pipelines/sales_pipeline.yaml"]'
    ).should('be.visible');
    cy.get(
      '[data-slot="canvas-code-workspace-surface"] [data-workspace-path="models/analytics/model_orders.sql"]'
    )
      .should('be.visible')
      .click();
    waitForE2eApiCall('/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', 'GET');

    cy.get('[data-slot="canvas-code-workspace-surface"] [data-testid="monaco-code-viewer"]')
      .should('be.visible')
      .contains('select *')
      .should('exist');
    cy.get(
      '[data-slot="canvas-code-workspace-surface"] [data-testid="monaco-code-viewer"] textarea.inputarea'
    ).should('have.prop', 'readOnly', true);
    cy.then(() => {
      expect(getE2eApiCalls(/^\/workspace\/files\//, 'POST')).to.have.length(0);
    });
    cy.location('pathname').should('eq', '/canvas');
    cy.get('[data-slot="canvas-workbench-tab-strip"]').should('not.exist');
  });

  for (const language of ['en', 'es'] as const) {
    it(`refreshes published project files in Code when compilation rejects Preview (${language})`, () => {
      cy.viewport(1000, 660);
      const copy = resolveCanvasViewCopy(language);
      stubProjectPublicationApis('invalid');
      visitWithE2eWorkspaceSession('/canvas', {
        onBeforeLoad(window) {
          window.localStorage.setItem(
            APPLICATION_LANGUAGE_STORAGE_KEY,
            JSON.stringify({ state: { language }, version: 0 })
          );
        },
      });
      cy.get('[data-slot="shell-file-menu-trigger"]').click();
      cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
      waitForE2eApiCall('/workspace/files', 'GET');
      cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
      cy.get('[data-slot="canvas-code-workspace-surface"]').should('be.visible');
      cy.get(
        '[data-slot="canvas-code-workspace-surface"] [data-workspace-path="models/orders_model.sql"]'
      ).should('not.exist');
      cy.then(() => getE2eApiCalls('/workspace/files', 'GET').length).then((initialReadCount) => {
        clickPreviewExecutionPlanFromOperationalDrawer();
        waitForE2eApiCall('/workspace/dbt/graph-artifacts/publications', 'POST');
        waitForE2eApiCall('/workspace/dbt/graph-artifacts/compiled-models', 'POST');
        cy.wrap(null).should(() => {
          expect(getE2eApiCalls('/workspace/files', 'GET').length).to.be.greaterThan(
            initialReadCount
          );
        });
      });
      cy.contains(copy.planGraphDbtCompilationFailedMessage).should('be.visible');
      cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]').click();
      cy.contains(copy.planStatusPreviewRequiredMessage).should('be.visible');
      cy.get(
        '[data-slot="canvas-code-workspace-surface"] [data-workspace-path="models/orders_model.sql"]'
      )
        .should('be.visible')
        .click();
      waitForE2eApiCall('/workspace/files/models%2Forders_model.sql', 'GET');
      for (const [width, height] of [
        [1440, 900],
        [1000, 660],
      ] as const) {
        cy.viewport(width, height);
        cy.get(
          '[data-slot="canvas-code-workspace-surface"] > [data-slot="route-workbench-frame"] > [data-slot="route-workbench-body"]'
        ).should(($body) => {
          const body = $body[0]!;
          const slots = body.querySelector('[data-slot="route-workbench-slot-stack"]')!;
          expect(
            slots.getBoundingClientRect().width,
            'shared slots fill the allocated body'
          ).to.be.closeTo(body.clientWidth, 1);
        });
      }
      cy.get(
        '[data-slot="canvas-code-workspace-surface"] [data-slot="workspace-file-code-editor"][data-file-path="models/orders_model.sql"]'
      )
        .find('[data-testid="monaco-code-viewer"] .view-lines')
        .invoke('text')
        .should((renderedCode) => {
          expect(renderedCode.replaceAll('\u00a0', ' ').replace(/\s+/g, ' ')).to.contain(
            "source('raw', 'orders')"
          );
        });
      cy.get(
        '[data-slot="canvas-code-workspace-surface"] [data-testid="monaco-code-viewer"] textarea.inputarea'
      ).should('have.prop', 'readOnly', true);
      cy.then(() => {
        const publications = getE2eApiCalls('/workspace/dbt/graph-artifacts/publications', 'POST');
        expect(publications).to.have.length(1);
        const publication = PublishGraphDbtWorkspaceArtifactsRequestSchema.parse(
          publications[0]!.body
        );
        expect(
          publication.artifacts.find((artifact) => artifact.path === 'models/orders_model.sql')
            ?.content
        ).to.contain("source('raw', 'orders')");
        expect(
          getE2eApiCalls('/workspace/dbt/graph-artifacts/compiled-models', 'POST')
        ).to.have.length(1);
        expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
        expect(getE2eApiCalls(/^\/workspace\/files\//, 'POST')).to.have.length(0);
      });
      cy.screenshot(`confirmed-files-after-compilation-rejection-${language}`);
    });

    it(`preserves the actual rejected Preview cause in Operations (${language})`, () => {
      const reason = PREVIEW_REJECTION_REASON;
      stubProjectPublicationApis('compiled');
      visitWithE2eWorkspaceSession('/canvas', {
        onBeforeLoad(window) {
          window.localStorage.setItem(
            APPLICATION_LANGUAGE_STORAGE_KEY,
            JSON.stringify({ state: { language }, version: 0 })
          );
        },
      });
      clickPreviewExecutionPlanFromOperationalDrawer();
      waitForE2eApiCall('/plans/preview', 'POST');
      cy.get('[data-testid="plan-preview-modal"] [data-slot="dialog-footer"]')
        .contains('button', resolveCanvasViewCopy(language).planPreviewCloseLabel)
        .click();
      cy.get('[data-testid="plan-preview-modal"]').should('not.exist');
      cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="problems"]').click();
      cy.get('[data-slot="bottom-operational-drawer-problems"]')
        .contains(reason)
        .should('be.visible');
      cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="runs"]').click();
      cy.get('[data-slot="bottom-operational-drawer-runs"]').contains(reason).should('be.visible');
      cy.get('[data-slot="shell-run-command"]').should('be.disabled');
      cy.then(() => {
        expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(1);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
      cy.screenshot(`preserved-preview-diagnostic-${language}`);
    });
  }
});
