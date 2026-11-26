// @vitest-environment jsdom
/** Mount the actual query/confirmation adapter and assert its one guarded save. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, within } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { WorkspaceDbtModelReferenceSchema } from '@dvt/contracts';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { IWorksheetCanvasModelQueryPort } from '../../ports/worksheetCanvasModel';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import { WorksheetCanvasModelQueryError } from '../../ports/worksheetCanvasModel';
import { AppServicesProvider } from '../../services/AppServicesContext';
import {
  buildDraftSaveSavedResponse,
  buildDraftSaveConflictResponse,
  buildDraftSaveDeniedResponse,
} from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { SqlWorksheetConversionProps } from './sqlWorksheet.types';
import {
  buildWorksheetCanvasProposal,
  buildWorksheetCanvasLiteralProposal,
} from './worksheetCanvasModel.test-fixtures';
import { WorksheetCanvasModelForm } from './WorksheetCanvasModelForm';

let container: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

type FormFixture = {
  props: SqlWorksheetConversionProps;
  propose: Mock<IWorksheetCanvasModelQueryPort['propose']>;
  saveGraphDraft: Mock<IWorkspaceGraphDraftAuthoringPort['saveGraphDraft']>;
  onBusyChange: Mock;
  render(overrides?: Partial<SqlWorksheetConversionProps>): void;
  setScope(scope: SqlWorksheetConversionProps['scope']): void;
};

function fixture(): FormFixture {
  const scope = {
    tenantId: 'tenant',
    projectId: 'project',
    environmentId: 'dev',
    targetAdapter: 'temporal' as const,
  };
  const props: SqlWorksheetConversionProps = {
    scope,
    sql: 'SELECT orders_id FROM public.orders',
    connection: { id: 'warehouse', name: 'Warehouse', type: 'postgres', database: 'analytics' },
    record: {
      revision: 'r1',
      savedAt: '2026-11-25T00:00:00Z',
      draft: {
        canvas: { id: 'canvas', kind: 'transformation', title: 'Canvas' },
        activeCanvasId: 'canvas',
        nodes: [],
        edges: [],
        nodeIds: [],
        nodePositions: {},
      },
    },
    insertions: [],
  };
  let currentScope: SqlWorksheetConversionProps['scope'] = scope;
  const propose = vi.fn<IWorksheetCanvasModelQueryPort['propose']>(async (input) =>
    buildWorksheetCanvasProposal(input, scope)
  );
  const saveGraphDraft = vi.fn<IWorkspaceGraphDraftAuthoringPort['saveGraphDraft']>(async () =>
    buildDraftSaveSavedResponse(scope)
  );
  const onBusyChange = vi.fn(),
    cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const sessionContext: SessionContextPort = {
    getWorkspaceScopeSnapshot: () => currentScope,
    getWorkspaceScope: () => currentScope,
    subscribeWorkspaceScope: () => (): void => {},
    buildRunContext: vi.fn(),
  };
  const render = (overrides: Partial<SqlWorksheetConversionProps> = {}): void =>
    act(() =>
      root.render(
        <QueryClientProvider client={cache}>
          <AppServicesProvider
            overrides={{
              worksheetCanvasModelQuery: { propose },
              workspaceGraphDraftAuthoringPort: { saveGraphDraft, readGraphDraft: vi.fn() },
              sessionContext,
            }}
          >
            <WorksheetCanvasModelForm {...props} {...overrides} onBusyChange={onBusyChange} />
          </AppServicesProvider>
        </QueryClientProvider>
      )
    );
  render();
  return {
    props,
    propose,
    saveGraphDraft,
    onBusyChange,
    render,
    setScope: (next: typeof scope) => {
      currentScope = next;
    },
  };
}

async function prepare(): Promise<void> {
  await act(async () => {
    fireEvent.change(within(container).getByLabelText('Model name'), {
      target: { value: 'Order IDs' },
    });
  });
  await act(async () => {
    fireEvent.click(within(container).getByRole('button', { name: 'Prepare Canvas Model' }));
  });
}

describe('WorksheetCanvasModelForm', () => {
  it('prepares a source-free literal and confirms exactly its displayed canonical proposal', async () => {
    const h = fixture();
    h.propose.mockImplementation(async (input) =>
      buildWorksheetCanvasLiteralProposal(input, h.props.scope)
    );
    h.render({ sql: 'SELECT 1 AS comprobacion_editor_sql' });
    await prepare();
    expect(h.propose.mock.calls[0]?.[0].models).toEqual([]);
    expect(within(container).getByText('comprobacion_editor_sql')).toBeDefined();
    expect(h.saveGraphDraft).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(within(container).getByRole('button', { name: 'Confirm Canvas Model' }));
    });
    expect(h.propose).toHaveBeenCalledTimes(2);
    expect(h.saveGraphDraft).toHaveBeenCalledTimes(1);
    const saved = h.saveGraphDraft.mock.calls[0]![0];
    const displayed = await h.propose.mock.results[0]!.value;
    if (displayed.status !== 'valid') throw new Error('Expected a complete literal proposal.');
    expect(saved.draft).toEqual(displayed.draft);
    expect(saved.draft.nodes).toHaveLength(1);
    expect(saved.draft.edges).toEqual([]);
    expect(saved.draft.nodes[0]?.metadata?.connectionRef).toEqual(displayed.connectionRef);
    expect(saved.expectedRevision).toBe('r1');
    expect(h.propose.mock.calls[1]?.[0].verifyContextSha256).toBe(displayed.contextSha256);
    expect(within(container).getByRole('status').textContent).toContain('Created Canvas Model');
  });
  it('shows real typed columns before a single complete graph save', async () => {
    const h = fixture();
    await prepare();
    expect(h.saveGraphDraft).not.toHaveBeenCalled();
    expect(within(container).getByText('orders_id')).toBeDefined();
    await act(async () => {
      fireEvent.click(within(container).getByRole('button', { name: 'Confirm Canvas Model' }));
      fireEvent.click(within(container).getByRole('button', { name: 'Confirm Canvas Model' }));
    });
    expect(h.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(h.propose).toHaveBeenCalledTimes(2);
    const saved = h.saveGraphDraft.mock.calls[0]![0];
    const displayed = await h.propose.mock.results[0]!.value;
    if (displayed.status !== 'valid') throw new Error('Expected displayed proposal');
    expect(h.propose.mock.calls[1]![0]).toEqual({
      ...h.propose.mock.calls[0]![0],
      verifyContextSha256: displayed.contextSha256,
    });
    expect(saved.draft).toEqual(displayed.draft);
    expect(saved.expectedRevision).toBe('r1');
    expect(saved.idempotencyKey).toContain('worksheet-canvas-model:');
    expect(
      saved.draft.nodes.find((node) => node.role === 'transform')?.metadata?.['transformAuthoring']
    ).toBeDefined();
    expect(saved.draft.edges).toHaveLength(1);
    expect(within(container).getByRole('status').textContent).toContain('Created Canvas Model');
    expect(h.onBusyChange.mock.calls.map(([busy]) => busy)).toEqual([true, false, true, false]);
  });
  it('invalidates confirmation when SQL or revision changes', async () => {
    const h = fixture();
    await prepare();
    h.render({ sql: 'SELECT other FROM public.orders' });
    const button = within(container).getByRole('button', {
      name: 'Confirm Canvas Model',
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(h.saveGraphDraft).not.toHaveBeenCalled();
    expect(within(container).getByRole('alert').textContent).toContain('changed');
  });
  it('rejects an authorization failure without a graph write', async () => {
    const h = fixture();
    h.propose.mockRejectedValueOnce(new WorksheetCanvasModelQueryError('denied'));
    await prepare();
    expect(within(container).getByRole('alert').textContent).toContain('permission');
    expect(h.saveGraphDraft).not.toHaveBeenCalled();
  });
  it.each([
    ['conflict', buildDraftSaveConflictResponse],
    ['denied', buildDraftSaveDeniedResponse],
  ] as const)('retains the actual %s outcome', async (kind, response) => {
    const h = fixture();
    h.saveGraphDraft.mockResolvedValueOnce(response(h.props.scope));
    await prepare();
    await act(async () => {
      fireEvent.click(within(container).getByRole('button', { name: 'Confirm Canvas Model' }));
    });
    expect(h.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(within(container).getByRole('alert').textContent).toContain(
      kind === 'conflict' ? 'changed' : 'permission'
    );
  });
  it('preserves an in-flight publication result even if inputs change', async () => {
    const h = fixture();
    let finish:
      | ((value: Awaited<ReturnType<IWorkspaceGraphDraftAuthoringPort['saveGraphDraft']>>) => void)
      | undefined;
    h.saveGraphDraft.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await prepare();
    await act(async () => {
      fireEvent.click(within(container).getByRole('button', { name: 'Confirm Canvas Model' }));
    });
    h.render({ sql: 'SELECT changed FROM public.orders' });
    expect(h.onBusyChange).toHaveBeenLastCalledWith(true);
    await act(async () => {
      if (!finish) throw new Error('Expected in-flight save');
      finish(buildDraftSaveSavedResponse(h.props.scope));
    });
    expect(within(container).getByRole('status').textContent).toContain('Order IDs');
    expect(h.onBusyChange).toHaveBeenLastCalledWith(false);
  });
  it('retries an uncertain save using the same body and idempotency key', async () => {
    const h = fixture();
    h.saveGraphDraft.mockRejectedValueOnce(new Error('connection lost'));
    await prepare();
    await act(async () => {
      fireEvent.click(within(container).getByRole('button', { name: 'Confirm Canvas Model' }));
    });
    expect(within(container).getByRole('alert').textContent).toContain('could not be confirmed');
    await act(async () => {
      fireEvent.click(within(container).getByRole('button', { name: 'Retry confirmation' }));
    });
    expect(h.saveGraphDraft).toHaveBeenCalledTimes(2);
    expect(h.saveGraphDraft.mock.calls[1]![0]).toEqual(h.saveGraphDraft.mock.calls[0]![0]);
  });
  it('does not save a proposal after the session scope changes', async () => {
    const h = fixture();
    await prepare();
    h.setScope({ ...h.props.scope, projectId: 'foreign' });
    await act(async () => {
      fireEvent.click(within(container).getByRole('button', { name: 'Confirm Canvas Model' }));
    });
    expect(h.saveGraphDraft).not.toHaveBeenCalled();
    expect(within(container).getByRole('alert').textContent).toContain('changed');
  });
  it('refuses confirmation if the actual source context changes after preparation', async () => {
    const h = fixture();
    await prepare();
    h.propose.mockImplementationOnce(async (input) => {
      return buildWorksheetCanvasProposal(input, h.props.scope, 'b'.repeat(64));
    });
    await act(async () => {
      fireEvent.click(within(container).getByRole('button', { name: 'Confirm Canvas Model' }));
    });
    expect(h.saveGraphDraft).not.toHaveBeenCalled();
    expect(within(container).getByRole('alert').textContent).toContain('changed');
  });
  it('captures an actual file-model reference and digests without fabricating a native semantic digest', async () => {
    const h = fixture(),
      fragment = '(SELECT orders_id FROM public.orders) AS dbt_orders';
    const reference = WorkspaceDbtModelReferenceSchema.parse({
      schemaVersion: 'workspace-dbt-model-reference.v1',
      canvasId: 'dbt-canvas',
      uniqueId: 'model.demo.orders',
      relationId: 'dbt-relation',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse',
        provider: 'postgres',
      },
      fields: [{ fieldId: 'orders-id', name: 'orders_id', dataType: 'text', nullable: true }],
    });
    h.render({
      sql: `SELECT orders_id FROM ${fragment}`,
      insertions: [
        {
          kind: 'dbt-model',
          nodeId: 'file-model',
          connectionRef: reference.connectionRef,
          reference,
          projectRevisionSha256: 'b'.repeat(64),
          analysisSha256: 'c'.repeat(64),
          alias: 'dbt_orders',
          fragment,
          binding: { kind: 'compiled', sqlSha256: 'd'.repeat(64) },
        },
      ],
    });
    await prepare();
    const observed = h.propose.mock.calls[0]![0].models[0];
    expect(observed).toMatchObject({
      kind: 'dbt-model',
      reference,
      projectRevisionSha256: 'b'.repeat(64),
      analysisSha256: 'c'.repeat(64),
    });
    expect(observed).not.toHaveProperty('semanticPlanSha256');
    expect(h.saveGraphDraft).not.toHaveBeenCalled();
  });
});
