// @vitest-environment jsdom
/** Source Preview consumes current publication, never stale card/physical columns. */
import { asIsoUtcString } from '@dvt/contracts';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanvasNodeColumnTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { SourceDataSample } from '../../ports/workspace';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerDataSample,
} from '../../components/shell/operationalDrawerContributionStore';
import { createCanvasShellHarness, getCanvasShellState } from './CanvasShell.testHarness';
import { canvasColumnTruth } from './canvasPresentationColumns';

const sample: SourceDataSample = {
  contractVersion: 1,
  connectionId: 'warehouse',
  objectId: 'relation/dvt/raw/orders',
  columns: [
    { name: 'client_id', type: 'text', nullable: false },
    { name: 'country', type: 'text', nullable: true },
  ],
  rows: [{ values: ['C-001', 'ES'] }],
  limit: 20,
  truncated: false,
  provenance: {
    mode: 'live',
    sourceRefs: [
      {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/dvt/raw/orders',
      },
    ],
    queriedAt: asIsoUtcString('2026-10-01T10:00:00.000Z'),
    limit: 20,
    navigation: 'bounded-first-page',
  },
};

let harness: ReturnType<typeof createCanvasShellHarness>;
let query: ReturnType<typeof vi.fn>;
beforeEach(() => {
  harness = createCanvasShellHarness();
  query = vi.fn().mockResolvedValue(sample);
});
afterEach(() => harness.unmount());

async function render(
  state: CanvasNodeColumnTruth['state'],
  selected = ['country'],
  connectionId = 'warehouse'
): Promise<DbtNodeData> {
  const data: DbtNodeData = {
    name: 'orders',
    status: 'idle',
    role: 'input',
    pluginKind: 'dvt:source',
    // Deliberately stale: query admission must use presentation truth, not this copy.
    columns: [{ name: 'client_id', type: 'text', output: true }],
    presentationTruth: {
      code: { kind: 'unavailable' },
      columns: {
        ...canvasColumnTruth(
          sample.columns.map((field) => ({
            ...field,
            name: `orders.${field.name}`,
            sourceFieldName: field.name,
            provenance: 'declared' as const,
            selected: selected.includes(field.name),
          })),
          []
        ),
        state,
      },
    },
    metadata: {
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId,
          provider: 'postgres',
        },
        sourceObjectId: sample.objectId,
      },
    },
  };
  await harness.render({
    warehouseSourceDataSampleQuery: { previewSourceObjectRows: query },
    graph: { nodesWithImpact: [{ id: 'orders', type: 'dbtNode', position: { x: 0, y: 0 }, data }] },
  });
  return (
    getCanvasShellState().canvasViewportProps!.nodesWithImpact as Array<{ data: DbtNodeData }>
  )[0]!.data;
}

function dataState(): OperationalDrawerDataSample | undefined {
  return useOperationalDrawerContributionStore
    .getState()
    .contribution?.tabs.find((tab) => tab.id === 'data:orders')?.dataSample;
}
function refreshAction(): (() => void) | undefined {
  return useOperationalDrawerContributionStore
    .getState()
    .contribution?.tabs.find((tab) => tab.id === 'data:orders')?.onRefresh;
}
async function preview(data: DbtNodeData): Promise<void> {
  await act(async () => {
    data.onOpenSourceDataSample?.('orders');
  });
}

it.each(['pending', 'unavailable', undefined] as const)(
  'denies a Source without ready publication (%s)',
  async (state) => {
    const data = await render(state);
    expect(data.onOpenSourceDataSample).toBeUndefined();
    await preview(data);
    expect(query).not.toHaveBeenCalled();
  }
);

it('denies zero selected outputs instead of showing every physical field', async () => {
  const data = await render('ready', []);
  expect(data.onOpenSourceDataSample).toBeUndefined();
  await preview(data);
  expect(query).not.toHaveBeenCalled();
});

it('uses authoritative published fields and their order', async () => {
  await preview(await render('ready', ['country']));
  expect(query).toHaveBeenCalledOnce();
  expect(dataState()).toMatchObject({
    status: 'ready',
    sample: {
      columns: [{ name: 'country' }],
      rows: [{ values: ['ES'] }],
    },
  });
});

it.each(['pending', 'unavailable', 'ready'] as const)(
  'withdraws old samples on changed publication (%s), without requery',
  async (state) => {
    const data = await render('ready', ['client_id', 'country']);
    await preview(data);
    expect(dataState()?.status).toBe('ready');
    await render(state, ['country']);
    expect(dataState()).toMatchObject({ status: 'error', reason: 'unavailable' });
    await preview(data); // An obsolete callback cannot restart an obsolete query.
    expect(query).toHaveBeenCalledTimes(1);
  }
);

it('rejects a late sample after fields are withdrawn, then admits the repaired publication', async () => {
  let complete!: (value: SourceDataSample) => void;
  query.mockReturnValueOnce(
    new Promise<SourceDataSample>((resolve) => {
      complete = resolve;
    })
  );
  await preview(await render('ready', ['client_id', 'country']));
  expect(dataState()?.status).toBe('loading');
  const repaired = await render('ready', ['country']);
  await act(async () => complete(sample));
  expect(dataState()).toMatchObject({ status: 'error', reason: 'unavailable' });
  await preview(repaired);
  expect(dataState()).toMatchObject({
    status: 'ready',
    sample: {
      columns: [{ name: 'country' }],
      rows: [{ values: ['ES'] }],
    },
  });
  expect(query).toHaveBeenCalledTimes(2);
});

it('does not invalidate samples or query again for unchanged publication', async () => {
  await preview(await render('ready'));
  await render('ready');
  expect(dataState()?.status).toBe('ready');
  expect(query).toHaveBeenCalledOnce();
});

it('refreshes the current publication explicitly, without marking old rows as fresh', async () => {
  await preview(await render('ready', ['client_id', 'country']));
  expect(typeof refreshAction()).toBe('function');
  await render('ready', ['country']);
  expect(dataState()?.status).toBe('error');
  expect(query).toHaveBeenCalledOnce();
  const next = {
    ...sample,
    rows: [{ values: ['C-001', 'PT'] }],
    provenance: {
      ...sample.provenance,
      queriedAt: asIsoUtcString('2026-10-01T11:00:00.000Z'),
    },
  };
  query.mockResolvedValueOnce(next);
  await act(async () => refreshAction()?.());
  expect(query).toHaveBeenCalledTimes(2);
  expect(dataState()).toMatchObject({
    status: 'ready',
    sample: {
      columns: [{ name: 'country' }],
      rows: [{ values: ['PT'] }],
      provenance: next.provenance,
    },
  });
});

it.each(['pending', 'unavailable', 'empty', 'deleted'] as const)(
  'withdraws refresh when the current Source is %s',
  async (state) => {
    await preview(await render('ready'));
    const obsolete = refreshAction();
    expect(typeof obsolete).toBe('function');
    if (state === 'deleted') await harness.render({ graph: { nodesWithImpact: [] } });
    else await render(state === 'empty' ? 'ready' : state, state === 'empty' ? [] : ['country']);
    expect(refreshAction()).toBeUndefined();
    await act(async () => obsolete?.());
    expect(query).toHaveBeenCalledOnce();
    expect(dataState()?.status).toBe('error');
  }
);

it('rejects a late refresh after rebinding and queries only the new binding on the next action', async () => {
  await preview(await render('ready'));
  let complete!: (value: SourceDataSample) => void;
  query.mockReturnValueOnce(
    new Promise<SourceDataSample>((resolve) => {
      complete = resolve;
    })
  );
  const obsolete = refreshAction();
  await act(async () => obsolete?.());
  expect(dataState()?.status).toBe('loading');
  await render('ready', ['country'], 'new-warehouse');
  await act(async () => {
    complete(sample);
    obsolete?.();
  });
  expect(dataState()?.status).toBe('error');
  expect(query).toHaveBeenCalledTimes(2);
  await act(async () => refreshAction()?.());
  expect(query).toHaveBeenCalledTimes(3);
  expect(query).toHaveBeenLastCalledWith(
    expect.objectContaining({ connectionId: 'new-warehouse' })
  );
});

it.each(['unchanged', 'moved', 'withdrawn'] as const)(
  'honors current user focus and publication when the drawer frame is delayed (%s)',
  async (state) => {
    let frame!: FrameRequestCallback;
    const schedule = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback;
      return 1;
    });
    const opener = document.createElement('button');
    const nextControl = document.createElement('button');
    const tab = document.createElement('button');
    tab.dataset.slot = 'bottom-operational-drawer-tab';
    tab.dataset.tab = 'data:orders';
    document.body.append(opener, nextControl, tab);
    try {
      const data = await render('ready');
      opener.focus();
      await preview(data);
      if (state === 'moved') nextControl.focus();
      if (state === 'withdrawn') await render('pending');
      act(() => frame(0));
      expect(document.activeElement).toBe(
        state === 'unchanged' ? tab : state === 'moved' ? nextControl : opener
      );
      expect(query).toHaveBeenCalledOnce();
    } finally {
      schedule.mockRestore();
      opener.remove();
      nextControl.remove();
      tab.remove();
    }
  }
);
