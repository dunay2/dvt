// @vitest-environment jsdom

import React, { act, useState } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import type { CanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';
import { SourceOverviewPanel } from './SourceOverviewPanel';

const node: CanonicalNode = {
  id: 'source-aut',
  name: 'aut',
  description: 'Authentication audit events captured from the local proof environment.',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source', 'dvt'],
  metadata: {
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'local-postgres-proof',
        provider: 'postgres',
      },
      sourceObjectId: 'relation/dvt/auth_audit_events',
    },
    schema: 'dvt',
    tableName: 'auth_audit_events',
    comment: 'Generic node comment without external database authority.',
  },
};

const initialDraft: CanvasInspectorNodeDraft = {
  name: 'aut',
  description: node.description ?? '',
  tags: ['source', 'dvt'],
  dvt: {
    kind: 'source',
    schema: 'dvt',
    table: 'auth_audit_events',
    alias: 'local_postgres_proof_dvt_dvt',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'local-postgres-proof',
      provider: 'postgres',
    },
  },
};

const readModel: NodePropertiesReadModel = {
  nodeId: node.id,
  nodeName: node.name,
  sections: [
    {
      id: 'general',
      label: 'General',
      rows: [
        { id: 'schema', label: 'Schema', value: 'dvt' },
        { id: 'table', label: 'Table', value: 'auth_audit_events' },
      ],
      tableRows: [],
    },
    {
      id: 'columns',
      label: 'Columns',
      rows: [],
      tableRows: [
        { id: 'event_id', cells: { name: 'event_id', type: 'text' } },
        { id: 'created_at', cells: { name: 'created_at', type: 'timestamptz' } },
      ],
    },
    {
      id: 'comments',
      label: 'Comments',
      rows: [
        {
          id: 'comment',
          label: 'Comment',
          value: 'Generic node comment without external database authority.',
        },
      ],
      tableRows: [],
    },
  ],
};

function Harness({ onApply }: Readonly<{ onApply: (draft: CanvasInspectorNodeDraft) => void }>): JSX.Element {
  const [draft, setDraft] = useState<CanvasInspectorNodeDraft>(initialDraft);
  const [tagsText, setTagsText] = useState('source, dvt');
  const draftController: CanvasNodeWorkbenchDraftController = {
    draft,
    tagsText,
    onDraftChange: setDraft,
    onTagsTextChange: setTagsText,
    onDraftSubmitted: vi.fn(),
    onResetDraft: () => {
      setDraft(initialDraft);
      setTagsText('source, dvt');
    },
  };

  return (
    <SourceOverviewPanel
      node={node}
      nodes={[node]}
      edges={[]}
      readModel={readModel}
      authoring={{ canEditNode: true, onApplyNodeDraft: onApply }}
      draftController={draftController}
    />
  );
}

describe('SourceOverviewPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('renders authoritative Source facts and DVT metadata without permanent form or save chrome', () => {
    act(() => root.render(<Harness onApply={vi.fn()} />));

    expect(container.textContent).toContain('Source metadata');
    expect(container.textContent).toContain('dvt');
    expect(container.textContent).toContain('auth_audit_events');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('DVT metadata');
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.textContent).not.toContain('Apply');
    expect(container.textContent).not.toContain('Save');
    expect(container.textContent).not.toContain('Autosaved');
  });

  it('does not relabel generic node comments as external database metadata', () => {
    act(() => root.render(<Harness onApply={vi.fn()} />));

    expect(container.textContent).not.toContain('Database comment');
    expect(container.textContent).not.toContain('Generic node comment without external database authority.');
  });

  it('uses the existing authoring command rail when activated Name editing loses focus', () => {
    const onApply = vi.fn();
    act(() => root.render(<Harness onApply={onApply} />));

    const nameBlock = Array.from(container.querySelectorAll('div.space-y-2')).find((element) =>
      element.textContent?.includes('Name')
    );
    const editButton = Array.from(nameBlock?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent === 'Edit'
    );
    expect(editButton).toBeDefined();

    act(() => fireEvent.click(editButton!));
    const input = container.querySelector('input[aria-label="Name"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    act(() => fireEvent.input(input!, { target: { value: 'audit events' } }));
    act(() => fireEvent.focusOut(input!));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]?.[0]).toMatchObject({ name: 'audit events' });
  });
});
