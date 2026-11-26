import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
  parseWorkspaceGraphDraftSaveRequest,
} from '@dvt/contracts';

import { buildProtectedDraftRecord } from '../../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../../src/app/services/workspace/workspaceGraphDraftProjection';
import {
  buildDraftReadOkResponse,
  buildDraftReadNotFoundResponse,
  buildDraftSaveSavedResponse,
} from '../../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { projectCanonicalNodeToAuthoringNode } from '../../../src/app/views/canvas/canvasDraftAuthoring';
import { normalizeProjectCanvasDraft } from '../../../src/app/views/canvas/canvasProjectCanvasLifecycle';
import { buildCanvasAuthoringDraft } from '../canvasDrafts/buildCanvasAuthoringDraft';
import { stubE2eApi, stubE2eJsonApi } from '../e2eApiStub';
import { clearBrowserEmulation } from '../shellWorkbench/browserEmulation';
import {
  E2E_PROJECT_WORKSPACE,
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
} from '../workspaceSession';

export interface ScreenCompositionFixtureInput {
  readonly ALTERNATE_WORKSPACE_SESSION: Readonly<{
    tenantId: string;
    projectId: string;
    environmentId: string;
  }>;
  readonly ALTERNATE_PROJECT_WORKSPACE: Readonly<{
    tenantId: string;
    projectId: string;
    environmentId: string;
  }> & { readonly projectName: string };
  readonly MODEL_PATH: string;
  readonly MODEL_SQL: string;
  readonly ORPHAN_PATH: string;
  readonly ORPHAN_SQL: string;
  readonly ALTERNATE_MODEL_PATH: string;
  readonly ALTERNATE_MODEL_SQL: string;
  readonly CLIPBOARD_EOL: string;
}
export interface ScreenCompositionScenario {
  persistedDraft: {
    revision: string;
    draft: ReturnType<typeof buildProtectedDraftRecord>['draft'];
  } | null;
  alternateDraft: ReturnType<typeof buildCanvasAuthoringDraft>;
}

function stubScreenCompositionFileTree({
  ALTERNATE_WORKSPACE_SESSION,
  MODEL_PATH,
  ORPHAN_PATH,
  ALTERNATE_MODEL_PATH,
}: ScreenCompositionFixtureInput): void {
  stubE2eApi('POST', /^\/workspace\/files\//, () => {
    throw new Error('Read-only project Code must not save workspace files.');
  });
  stubE2eApi('GET', '/workspace/files', ({ headers }) => ({
    body:
      headers['x-project-id'] === ALTERNATE_WORKSPACE_SESSION.projectId
        ? [
            {
              path: 'models',
              name: 'models',
              kind: 'directory',
              children: [
                {
                  path: 'models/staging',
                  name: 'staging',
                  kind: 'directory',
                  children: [
                    {
                      path: ALTERNATE_MODEL_PATH,
                      name: 'alternate_orders.sql',
                      kind: 'file',
                    },
                  ],
                },
              ],
            },
          ]
        : [
            {
              path: 'dbt_project.yml',
              name: 'dbt_project.yml',
              kind: 'file',
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
                      path: MODEL_PATH,
                      name: 'model_orders.sql',
                      kind: 'file',
                    },
                    {
                      path: ORPHAN_PATH,
                      name: 'orphan_metrics.sql',
                      kind: 'file',
                    },
                  ],
                },
              ],
            },
          ],
  }));
}

function stubScreenCompositionFileContent({
  ALTERNATE_WORKSPACE_SESSION,
  MODEL_PATH,
  MODEL_SQL,
  ORPHAN_PATH,
  ORPHAN_SQL,
  ALTERNATE_MODEL_PATH,
  ALTERNATE_MODEL_SQL,
}: ScreenCompositionFixtureInput): void {
  stubE2eJsonApi('GET', '/workspace/files/dbt_project.yml', {
    path: 'dbt_project.yml',
    name: 'dbt_project.yml',
    language: 'yaml',
    content: 'name: e2e_project\nversion: 2',
    contentSha256: 'a'.repeat(64),
    lastModified: '2026-08-06T00:00:00.000Z',
  });
  stubE2eJsonApi('GET', '/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', {
    path: MODEL_PATH,
    name: 'model_orders.sql',
    language: 'sql',
    content: MODEL_SQL,
    contentSha256: 'b'.repeat(64),
    lastModified: '2026-08-06T00:00:00.000Z',
  });
  stubE2eJsonApi('GET', '/workspace/files/models%2Fanalytics%2Forphan_metrics.sql', {
    path: ORPHAN_PATH,
    name: 'orphan_metrics.sql',
    language: 'sql',
    content: ORPHAN_SQL,
    contentSha256: 'c'.repeat(64),
    lastModified: '2026-08-06T00:00:00.000Z',
  });
  stubE2eApi('GET', '/workspace/files/models%2Fstaging%2Falternate_orders.sql', ({ headers }) => {
    expect(headers['x-project-id']).to.equal(ALTERNATE_WORKSPACE_SESSION.projectId);
    return {
      body: {
        path: ALTERNATE_MODEL_PATH,
        name: 'alternate_orders.sql',
        language: 'sql',
        content: ALTERNATE_MODEL_SQL,
        contentSha256: 'd'.repeat(64),
        lastModified: '2026-08-06T00:00:00.000Z',
      },
    };
  });
  stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
}

function stubScreenCompositionDraftRead(
  { ALTERNATE_WORKSPACE_SESSION }: ScreenCompositionFixtureInput,
  scenario: ScreenCompositionScenario
): void {
  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    const requestedProjectId = url.searchParams.get('projectId');
    if (requestedProjectId === ALTERNATE_WORKSPACE_SESSION.projectId) {
      return {
        body: buildDraftReadOkResponse(ALTERNATE_WORKSPACE_SESSION, {
          record: buildProtectedDraftRecord(ALTERNATE_WORKSPACE_SESSION, {
            revision: 'rev-alternate-project',
            draft: scenario.alternateDraft,
            updatedAt: '2026-08-06T00:00:00.000Z',
          }),
        }),
      };
    }

    expect(requestedProjectId).to.equal(E2E_WORKSPACE_SESSION.projectId);
    if (scenario.persistedDraft == null) {
      return {
        statusCode: 404,
        body: buildDraftReadNotFoundResponse(E2E_WORKSPACE_SESSION),
      };
    }

    return {
      body: buildDraftReadOkResponse(E2E_WORKSPACE_SESSION, {
        record: buildProtectedDraftRecord(E2E_WORKSPACE_SESSION, {
          revision: scenario.persistedDraft.revision,
          draft: scenario.persistedDraft.draft,
          updatedAt: '2026-06-12T00:00:00.000Z',
        }),
      }),
    };
  });
}

function stubScreenCompositionDraftSave(scenario: ScreenCompositionScenario): void {
  stubE2eApi('PUT', '/workspace/graph/draft', ({ body }) => {
    const saveRequest = parseWorkspaceGraphDraftSaveRequest(body);

    const expectedRevision =
      scenario.persistedDraft?.revision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION;
    expect(saveRequest).to.deep.include({
      scope: E2E_WORKSPACE_SESSION,
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      expectedRevision,
    });
    if (expectedRevision === WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION) {
      expect(saveRequest.draft.canvas).to.deep.include({
        id: 'canvas',
        kind: 'transformation',
        title: 'Canvas',
      });
      expect(saveRequest.draft.nodeIds).to.deep.equal([]);
      expect(saveRequest.draft.nodes).to.deep.equal([]);
      expect(saveRequest.draft.edges).to.deep.equal([]);
    }
    scenario.persistedDraft = {
      revision: 'rev-e2e-first-canvas',
      draft: saveRequest.draft,
    };

    return {
      body: buildDraftSaveSavedResponse(E2E_WORKSPACE_SESSION, {
        revision: 'rev-e2e-first-canvas',
      }),
    };
  });
}

function stubScreenCompositionRuns({
  ALTERNATE_WORKSPACE_SESSION,
}: ScreenCompositionFixtureInput): void {
  stubE2eApi('GET', '/runs', ({ url, headers }) => {
    const projectId = url.searchParams.get('projectId');
    expect(headers['x-project-id']).to.equal(projectId);
    const alternate = projectId === ALTERNATE_WORKSPACE_SESSION.projectId;
    return {
      body: {
        items: [
          {
            runId: alternate ? 'run_alternate_project' : 'run_primary_project',
            planId: alternate ? 'plan_alternate_project' : 'plan_primary_project',
            status: 'COMPLETED',
            environmentId: alternate
              ? ALTERNATE_WORKSPACE_SESSION.environmentId
              : E2E_WORKSPACE_SESSION.environmentId,
            startedAt: '2026-08-06T00:00:00.000Z',
            completedAt: '2026-08-06T00:00:10.000Z',
          },
        ],
      },
    };
  });
}

export function stubScreenCompositionScenario(
  input: ScreenCompositionFixtureInput
): ScreenCompositionScenario {
  const { ALTERNATE_WORKSPACE_SESSION, ALTERNATE_PROJECT_WORKSPACE } = input;

  clearBrowserEmulation();
  cy.viewport(1544, 868);
  stubShellBootstrapApis({
    projectIds: [E2E_WORKSPACE_SESSION.projectId, ALTERNATE_WORKSPACE_SESSION.projectId],
    scopes: [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'plan:preview',
      'run:start',
    ],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE, ALTERNATE_PROJECT_WORKSPACE],
  });
  stubScreenCompositionFileTree(input);
  stubScreenCompositionFileContent(input);
  const alternateDraftFixture = buildCanvasAuthoringDraft({
    authoringGenerated: true,
    title: 'Alternate staging canvas',
  });
  const { canonicalNodes } =
    projectWorkspaceGraphAuthoringDraftSemanticGraph(alternateDraftFixture);
  const alternateDraft = normalizeProjectCanvasDraft({
    ...alternateDraftFixture,
    nodes: canonicalNodes.map(projectCanonicalNodeToAuthoringNode),
    nodePositions: {
      ...alternateDraftFixture.nodePositions,
      'source-1': { x: 40, y: 140 },
      'dvt-transform-1': { x: 420, y: 140 },
      'sink-1': { x: 800, y: 140 },
    },
  });

  const scenario: ScreenCompositionScenario = { persistedDraft: null, alternateDraft };
  stubScreenCompositionDraftRead(input, scenario);
  stubScreenCompositionDraftSave(scenario);
  stubScreenCompositionRuns(input);
  return scenario;
}
