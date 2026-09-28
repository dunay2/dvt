import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanvasMaterializationControl } from './canvasMaterializationControl';

const node: CanonicalNode = {
  id: 'model',
  name: 'Model',
  kind: 'dvt:transform',
  pluginId: 'dvt',
  role: 'transform',
  status: 'idle',
  tags: [],
};

describe('native materialization presentation', () => {
  it('exposes admitted values and delegates only the selected intent', () => {
    const change = vi.fn();
    const control = projectCanvasMaterializationControl({ node, label: 'Materialization', change });
    expect(control).toMatchObject({ value: 'view', disabled: false });
    expect(control?.options.map((option) => option.value)).toEqual(['view', 'table']);
    control?.onChange('table');
    expect(change).toHaveBeenCalledExactlyOnceWith('model', 'table');
    expect(node.metadata).toBeUndefined();
  });

  it('keeps the recorded value visible but disabled without mutation permission', () => {
    const control = projectCanvasMaterializationControl({
      node: { ...node, metadata: { config: { materialized: 'table' } } },
      label: 'Materialization',
    });
    expect(control).toMatchObject({ value: 'table', disabled: true });
    expect(() => control?.onChange('view')).not.toThrow();
  });

  it.each([
    { ...node, pluginId: 'dbt' },
    { ...node, kind: 'dvt:source', role: 'input' },
    { ...node, metadata: { authority: 'dbt-project-files' } },
    { ...node, metadata: { dbt: {} } },
    { ...node, metadata: { config: { materialized: 'incremental' } } },
  ] as CanonicalNode[])(
    'does not invent native editing for unsupported authority/configuration %#',
    (candidate) => {
      expect(
        projectCanvasMaterializationControl({
          node: candidate,
          label: 'Materialization',
          change: vi.fn(),
        })
      ).toBeUndefined();
    }
  );
});
