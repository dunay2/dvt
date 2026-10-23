// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import * as projection from './canvasDvtSubstraitOutputProjection';
import { DvtTransformOutputView, type DvtTransformOutputViewProps } from './DvtTransformOutputView';

vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({ language, value }: { language: string; value: string }) => (
    <pre data-testid="monaco-code-viewer" data-language={language}>
      {value}
    </pre>
  ),
}));

const TRANSFORM: CanonicalNode = {
  id: 'model',
  name: 'Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};
const PROPS: DvtTransformOutputViewProps = {
  transformNode: TRANSFORM,
  nodes: [TRANSFORM],
  edges: [],
  canonicalContent: '{"schemaVersion":"canonical"}',
  copy: {
    inspectorTransformOutputViewLabel: 'Output view',
    inspectorTransformOutputSubstraitLabel: 'Substrait',
    inspectorTransformOutputPostgresSqlLabel: 'PostgreSQL SQL',
    inspectorTransformOutputLoadingMessage: 'Loading',
    inspectorTransformOutputErrorMessage: 'Projection failed',
  },
};

function pendingProjection(): Readonly<{
  promise: Promise<string>;
  resolve: (value: string) => void;
}> {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

describe('Canonical code inspection query lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root;
  let project: MockInstance<typeof projection.projectDvtSubstraitTransformOutputToPostgresSql>;

  function render(props: DvtTransformOutputViewProps = PROPS): void {
    act(() => root.render(<DvtTransformOutputView {...props} />));
  }

  function select(value: 'substrait' | 'postgres-sql'): void {
    act(() => fireEvent.change(container.querySelector('select')!, { target: { value } }));
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    project = vi.spyOn(projection, 'projectDvtSubstraitTransformOutputToPostgresSql');
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('does not query until SQL is selected and reuses a ready result for the same input', async () => {
    project.mockResolvedValue('select current_model');
    render();
    expect(project).not.toHaveBeenCalled();
    expect(container.querySelector('pre')?.dataset.language).toBe('json');
    select('postgres-sql');
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelectorAll('pre')).toHaveLength(1);
    expect(container.querySelector('pre')?.dataset.language).toBe('sql');
    expect(container.querySelector('pre')?.textContent).toBe('select current_model');
    select('substrait');
    expect(container.querySelector('pre')?.textContent).toBe(PROPS.canonicalContent);
    select('postgres-sql');
    expect(project).toHaveBeenCalledOnce();
  });

  it('reuses the same pending query across a canonical/SQL roundtrip', async () => {
    const pending = pendingProjection();
    project.mockReturnValue(pending.promise);
    render();
    select('postgres-sql');
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Loading');
    select('substrait');
    select('postgres-sql');
    expect(project).toHaveBeenCalledOnce();
    await act(async () => {
      pending.resolve('select once');
    });
    expect(container.querySelector('pre')?.textContent).toBe('select once');
  });

  it.each(['transformNode', 'nodes', 'edges'] as const)(
    'does not reuse SQL after %s changes',
    async (field) => {
      project.mockResolvedValue('select previous_graph');
      render();
      select('postgres-sql');
      await act(async () => {
        await Promise.resolve();
      });
      const changed: DvtTransformOutputViewProps = {
        ...PROPS,
        ...(field === 'transformNode' ? { transformNode: { ...TRANSFORM, name: 'Changed' } } : {}),
        ...(field === 'nodes' ? { nodes: [...PROPS.nodes] } : {}),
        ...(field === 'edges' ? { edges: [...PROPS.edges] } : {}),
      };
      render(changed);
      expect(container.querySelector('select')?.value).toBe('substrait');
      expect(container.querySelector('pre')?.textContent).toBe(PROPS.canonicalContent);
      expect(project).toHaveBeenCalledOnce();
      project.mockResolvedValue('select current_graph');
      select('postgres-sql');
      await act(async () => {
        await Promise.resolve();
      });
      expect(project).toHaveBeenCalledTimes(2);
      expect(project.mock.calls[1]![0]).toEqual({
        transformNode: changed.transformNode,
        nodes: changed.nodes,
        edges: changed.edges,
      });
      expect(container.querySelector('pre')?.textContent).toBe('select current_graph');
    }
  );

  it('ignores an older completion after a query for a new input starts', async () => {
    const old = pendingProjection();
    const current = pendingProjection();
    project.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    render();
    select('postgres-sql');
    render({ ...PROPS, nodes: [...PROPS.nodes] });
    expect(container.querySelector('select')?.value).toBe('substrait');
    select('postgres-sql');
    await act(async () => {
      current.resolve('select current_graph');
    });
    await act(async () => {
      old.resolve('select stale_graph');
    });
    expect(container.querySelector('pre')?.textContent).toBe('select current_graph');
  });

  it('keeps a failed query explicit and retries only after another SQL selection', async () => {
    project
      .mockRejectedValueOnce(new Error('Invalid graph'))
      .mockResolvedValueOnce('select recovered');
    render();
    select('postgres-sql');
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Projection failed');
    expect(container.querySelector('pre')).toBeNull();
    select('substrait');
    expect(project).toHaveBeenCalledOnce();
    select('postgres-sql');
    await act(async () => {
      await Promise.resolve();
    });
    expect(project).toHaveBeenCalledTimes(2);
    expect(container.querySelector('pre')?.textContent).toBe('select recovered');
  });

  it('cannot deliver a pending result into a new mounted inspection', async () => {
    const pending = pendingProjection();
    project.mockReturnValue(pending.promise);
    render();
    select('postgres-sql');
    act(() => root.render(null));
    render();
    await act(async () => {
      pending.resolve('select unmounted_graph');
    });
    expect(container.querySelector('pre')?.textContent).toBe(PROPS.canonicalContent);
    expect(container.querySelector('select')?.value).toBe('substrait');
  });
});
