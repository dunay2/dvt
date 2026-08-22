// @vitest-environment jsdom

import { sha256HexUtf8 } from '@dvt/crypto';
import { fireEvent } from '@testing-library/dom';
import React from 'react';
import { act } from 'react';
import { vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { mockGraphDraftAuthoringAuthority } from '../../../testing/workspacePortDoubles';
import { withTestQueryClient, waitForReactQuery } from '../../../testing/reactQueryHarness';
import type {
  FileContent,
  IWorkspaceDiffQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
} from '../../ports/workspace';
import { AppServicesProvider } from '../../services/AppServicesContext';
import DiffView from '../DiffView';

vi.mock('../../components/monaco/MonacoDiffViewer', () => ({
  MonacoDiffViewer: ({
    modified,
    modifiedLabel,
    original,
    originalLabel,
  }: {
    modified: string;
    modifiedLabel: string;
    original: string;
    originalLabel: string;
  }) => (
    <div data-testid="monaco-diff-viewer">
      <span>{originalLabel}</span>
      <span>{modifiedLabel}</span>
      <pre>{original}</pre>
      <pre>{modified}</pre>
    </div>
  ),
}));

export type DiffViewMounted = Awaited<ReturnType<typeof withTestQueryClient>>;

export type DiffViewWorkspacePortOverrides = {
  graph?: Partial<IWorkspaceGraphSnapshotQueryPort>;
  diff?: Partial<IWorkspaceDiffQueryPort>;
  files?: Partial<IWorkspaceFilesQueryPort>;
};

export function installDiffViewDomDoubles(): () => void {
  (
    globalThis as typeof globalThis & {
      ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
    }
  ).ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;

  return () => {
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  };
}

export function buildFileContent(path: string): FileContent {
  if (path.includes('dim_store')) {
    const content = [
      'SELECT',
      '  s.store_id,',
      '  s.store_name,',
      '  s.store_city',
      'FROM raw.store_dim s',
    ].join('\n');
    return {
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content,
      contentSha256: sha256HexUtf8(content),
      lastModified: '2026-04-06T00:00:00Z',
    };
  }

  const content = [
    'SELECT',
    '  o.order_id,',
    '  o.customer_id,',
    '  o.order_date,',
    '  s.store_id,',
    '  o.total_amount',
    'FROM {{ ref("stg_orders") }} o',
    'LEFT JOIN {{ ref("dim_store") }} s',
    '  ON o.store_id = s.store_id',
    "WHERE o.order_date >= '2020-01-01'",
  ].join('\n');
  return {
    path,
    name: path.split('/').at(-1) ?? path,
    language: 'sql',
    content,
    contentSha256: sha256HexUtf8(content),
    lastModified: '2026-04-06T00:00:00Z',
  };
}

export function buildDiffViewWorkspacePorts(overrides?: DiffViewWorkspacePortOverrides): {
  workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  workspaceDiffQuery: IWorkspaceDiffQueryPort;
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
} {
  const workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort = {
    getGraphSnapshot: async () => ({
      authoringAuthority: mockGraphDraftAuthoringAuthority,
      nodes: [
        {
          id: 'fct_sales',
          name: 'fct_sales',
          type: 'MODEL',
          package: 'analytics',
          path: 'models/marts/fct_sales.sql',
          tags: [],
          status: 'success',
          dependencies: ['stg_orders', 'dim_store'],
          compiledSql: [
            'SELECT',
            '  o.order_id,',
            '  o.customer_id,',
            '  o.order_date,',
            '  s.store_id,',
            '  o.total_amount',
            'FROM {{ ref("stg_orders") }} o',
            'LEFT JOIN {{ ref("dim_store") }} s',
            '  ON o.store_id = s.store_id',
          ].join('\n'),
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'customer_id', type: 'INTEGER', nullable: false },
            { name: 'order_date', type: 'DATE', nullable: false },
            { name: 'store_id', type: 'INTEGER', nullable: true },
            { name: 'total_amount', type: 'NUMERIC(18,2)', nullable: true },
          ],
        },
      ],
      edges: [],
    }),
    ...overrides?.graph,
  };
  const workspaceDiffQuery: IWorkspaceDiffQueryPort = {
    getDiffChanges: async () => [
      {
        id: '1',
        nodeId: 'fct_sales',
        type: 'changed',
        severity: 'breaking',
        description: 'Column removed: discount_amount',
        oldValue: 'discount_amount DECIMAL',
        newValue: null,
      },
      {
        id: '2',
        nodeId: 'fct_sales',
        type: 'changed',
        severity: 'info',
        description: 'Added WHERE clause filter',
        oldValue: 'No filter',
        newValue: "WHERE o.order_date >= '2020-01-01'",
      },
    ],
    ...overrides?.diff,
  };
  const workspaceFilesQuery: IWorkspaceFilesQueryPort = {
    listFiles: async () => [],
    getFileContent: async (path) => buildFileContent(path),
    ...overrides?.files,
  };
  return {
    workspaceGraphSnapshotQuery,
    workspaceDiffQuery,
    workspaceFilesQuery,
  };
}

export async function renderDiffView(
  overrides?: DiffViewWorkspacePortOverrides
): Promise<DiffViewMounted> {
  return withTestQueryClient(
    <AppServicesProvider
      overrides={{
        ...createAppServicesTestOverrides(),
        ...buildDiffViewWorkspacePorts(overrides),
      }}
    >
      <DiffView />
    </AppServicesProvider>
  );
}

export async function waitForDiffViewText(
  mounted: DiffViewMounted | null,
  text: string,
  description: string
): Promise<void> {
  await waitForReactQuery(() => mounted?.container.textContent?.includes(text) === true, {
    description,
  });
}

export function findDiffViewButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(label)
  );
}

export async function activateDiffViewButton(button: HTMLButtonElement | undefined): Promise<void> {
  await act(async () => {
    if (button) {
      fireEvent.mouseDown(button, { button: 0 });
      fireEvent.click(button);
    }
  });
}
