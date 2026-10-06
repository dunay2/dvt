/**
 * Owned concern: preserve scenario payloads and identities during fixture extraction.
 * @baseline GH-3578: separating builders must not change retained consumer semantics.
 * @decision Validate the V1 draft contract and topology across the existing scenario families.
 * @consequence Browser consumers retain their data while fixture construction remains pure.
 * @version 1.0.0
 */
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as draftAdapter from '../../../../cypress/support/canvasDraftAuthoring';
import { buildCanvasAuthoringDraft } from '../../../../cypress/support/canvasDrafts/buildCanvasAuthoringDraft';
import type {
  CanvasAuthoringDraft,
  CanvasDraftScenarioOptions,
} from '../../../../cypress/support/canvasDrafts/scenario';
import * as draftHttp from '../../../../cypress/support/e2eApiStub';
import {
  readLiveGraphDraft,
  readLiveRunIds,
  readLiveWorkspaceFile,
} from '../../../../cypress/support/liveProtectedRuntime';
import { stubWorkbenchScenario } from '../../../../cypress/support/relationalWorkbench/scenario';
import { E2E_WORKSPACE_SESSION } from '../../../../cypress/support/workspaceSession';
import type { buildDraftReadOkResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { normalizeProjectCanvasDraft } from './canvasProjectCanvasLifecycle';

const cases: readonly [string, CanvasDraftScenarioOptions, number, number][] = [
  ['ordinary', {}, 3, 2],
  ['ordinary loose', { includeLooseNode: true }, 4, 2],
  ['empty', { emptyCanvas: true }, 0, 0],
  ['warehouse', { dbtGraph: true, importedWarehouseSource: true }, 1, 0],
  ['dbt', { dbtGraph: true }, 3, 2],
  ['columns', { columnMapping: true }, 3, 2],
  ['disconnected columns', { columnMapping: true, columnMappingDisconnected: true }, 3, 1],
  ['columns with another source', { columnMapping: true, columnMappingSecondSource: true }, 4, 2],
  ['column inspection', { columnMapping: true, sourceInspectorOrdering: true }, 4, 3],
  ['generated', { authoringGenerated: true }, 3, 2],
  ['generated loose', { authoringGenerated: true, includeLooseNode: true }, 4, 2],
  ['live preview', { authoringGenerated: true, terminalTransformPreview: true }, 2, 1],
  ['pending join', { substraitPendingComposition: true }, 3, 2],
  ['join', { substraitInnerJoin: true }, 3, 2],
  ['join catalogue', { substraitNInputJoin: true }, 5, 4],
  ['union', { substraitUnionAll: true }, 3, 2],
  ['projection', { projectionModel: true }, 2, 1],
  ['unsupported', { substraitUnsupported: true }, 2, 1],
  ['performance', { performanceGraphNodeCount: 10 }, 10, 9],
  ['large', { largeGraph: true }, 1000, 1920],
];

describe('Canvas draft scenarios', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(cases)(
    'preserves %s topology without shared mutable fixtures',
    (_, options, nodes, edges) => {
      const draft = buildCanvasAuthoringDraft(options);
      expect(WorkspaceGraphAuthoringDraftSchema.safeParse(draft).success).toBe(true);
      expect(draft.nodes).toHaveLength(nodes);
      expect(draft.edges).toHaveLength(edges);
      expect(draft.nodeIds).toEqual(draft.nodes.map((node) => node.id));
      expect(new Set(draft.nodeIds).size).toBe(nodes);
      for (const edge of draft.edges) {
        expect(draft.nodeIds).toContain(edge.sourceId);
        expect(draft.nodeIds).toContain(edge.targetId);
      }
      if (draft.nodes[0] != null) draft.nodes[0].name = 'changed in test';
      expect(buildCanvasAuthoringDraft(options).nodes[0]?.name).not.toBe('changed in test');
    }
  );

  it('preserves UNION source and edge identities and explicit projection selection', () => {
    const union = buildCanvasAuthoringDraft({ substraitUnionAll: true });
    expect(union.nodes.slice(0, -1).map((node) => node.name)).toEqual([
      'customers_north',
      'customers_south',
    ]);
    expect(union.edges).toEqual(
      ['north', 'south'].map((side) => ({
        id: `${side}-union`,
        sourceId: `source-customers-${side}`,
        targetId: 'union-transform',
        relation: 'lineage',
      }))
    );
    const projection = buildCanvasAuthoringDraft({
      projectionModel: true,
      projectionInputFields: ['country'],
    });
    expect(projection.edges[0]?.metadata).toMatchObject({
      inputBindings: { fields: [{ inputId: 'input:country', producerFieldId: 'country' }] },
    });
  });

  it('normalizes the captured GET seed without changing semantics or positions', async () => {
    const register = vi.spyOn(draftHttp, 'stubE2eApi');
    const originalSeed = draftAdapter.stubStatefulCanvasDraftAuthoring;
    const originals: CanvasAuthoringDraft[] = [];
    const seed = vi
      .spyOn(draftAdapter, 'stubStatefulCanvasDraftAuthoring')
      .mockImplementation((...args) => {
        const draft = originalSeed(...args);
        originals.push(structuredClone(draft));
        return draft;
      });
    const draft = stubWorkbenchScenario('saved-join');
    expect(seed).toHaveBeenCalledTimes(1);
    expect(draft).toBe(seed.mock.results[0]?.value);
    const responder = register.mock.calls.find(
      ([method, path]) => method === 'GET' && path === '/workspace/graph/draft'
    )![2];
    const response = await responder({
      method: 'GET',
      url: new URL(
        `https://fixture.invalid/workspace/graph/draft?${new URLSearchParams(E2E_WORKSPACE_SESSION)}`
      ),
      body: undefined,
      headers: {},
    });
    expect((response.body as ReturnType<typeof buildDraftReadOkResponse>).record.draft).toBe(draft);
    expect(normalizeProjectCanvasDraft(draft)).toEqual(draft);
    expect(draft.nodes.map(({ kind }) => kind)).toEqual(['source', 'source', 'transform']);
    expect(draft.nodes.map(({ metadata }) => metadata)).toEqual(
      originals[0]!.nodes.map(({ metadata }) => metadata)
    );
    expect(draft.nodePositions).toEqual(originals[0]!.nodePositions);
    expect(draft.edges).toEqual(originals[0]!.edges);
  });
});

describe('Shared protected LIVE request contract', () => {
  afterEach(() => vi.unstubAllGlobals());

  const environment: Record<string, string> = {
    apiBaseUrl: ' https://fixture.invalid ',
    apiBearerToken: ' test-only-token ',
    workspaceTenantId: 'tenant test',
    workspaceProjectId: 'project test',
    workspaceEnvironmentId: 'dev test',
  };

  it.each([
    [() => readLiveGraphDraft(), '/workspace/graph/draft'],
    [() => readLiveRunIds(), '/runs'],
    [
      () => readLiveWorkspaceFile('models/orders view.sql'),
      '/workspace/files/models%2Forders%20view.sql',
    ],
  ] as const)(
    'preserves authentication and workspace scope for request %s',
    async (read, pathname) => {
      const request = vi.fn().mockResolvedValue({ status: 200, body: { items: [] } });
      vi.stubGlobal('Cypress', { env: (name: string) => environment[name] });
      vi.stubGlobal('cy', { request });
      await expect(read()).resolves.toBeDefined();
      expect(request).toHaveBeenCalledExactlyOnceWith({
        method: 'GET',
        url: `https://fixture.invalid${pathname}?tenantId=tenant+test&projectId=project+test&environmentId=dev+test`,
        headers: { Authorization: 'Bearer test-only-token', Accept: 'application/json' },
        auth: { bearer: 'test-only-token' },
        ...(pathname === '/workspace/graph/draft' ? { failOnStatusCode: undefined } : {}),
      });
    }
  );

  it.each(['apiBaseUrl', 'apiBearerToken'])(
    'rejects blank %s before issuing a request',
    (missing) => {
      const request = vi.fn();
      vi.stubGlobal('Cypress', {
        env: (name: string) => (name === missing ? ' ' : environment[name]),
      });
      vi.stubGlobal('cy', { request });
      expect(() => readLiveGraphDraft()).toThrow(`Cypress env ${missing} is required`);
      expect(request).not.toHaveBeenCalled();
    }
  );
});
