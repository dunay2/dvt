import { isValidElement, type ReactElement, type RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildDbtProjectFileCodeWorkbench } from './dbtProjectFileCodeWorkbench';
import type { SqlContextWorkbenchHandle, SqlContextWorkbenchProps } from './SqlContextWorkbench';

const copy = {
  nodeWorkbenchCloseLabel: 'Close',
  sqlContextWorkbenchLoadingMessage: 'Loading code',
  sqlContextWorkbenchNodeTitle: 'Node code',
  sqlContextWorkbenchProjectTitle: 'Project code',
};

describe('buildDbtProjectFileCodeWorkbench', () => {
  it('targets the exact SQL file owned by the selected DBT node', () => {
    const onProjectChanged = vi.fn(async () => undefined);
    const workbench = buildDbtProjectFileCodeWorkbench({
      copy,
      workbenchRef: { current: null },
      onClose: vi.fn(),
      onProjectChanged,
      projectRoot: 'analytics',
      target: {
        kind: 'node',
        nodeId: 'model.analytics.orders',
        initialPath: 'analytics/models/marts/orders.sql',
      },
    });

    expect(workbench?.id).toBe('node-code');
    expect(workbench?.title).toBe('Node code');
    expect(workbench?.closeLabel).toBe('Close');
    expect(workbench?.description).toBe('analytics/models/marts/orders.sql');
    expect(isValidElement(workbench?.panel)).toBe(true);
    const panel = workbench?.panel as ReactElement<SqlContextWorkbenchProps>;
    expect(panel.props.fileScope).toEqual({
      kind: 'dbt-project-files',
      projectRoot: 'analytics',
      initialPath: 'analytics/models/marts/orders.sql',
    });
    expect(panel.props.onFileSynchronized).toBe(onProjectChanged);
  });

  it('opens the project scope without fabricating a selected file', () => {
    const onProjectChanged = vi.fn(async () => undefined);
    const workbench = buildDbtProjectFileCodeWorkbench({
      copy,
      workbenchRef: { current: null },
      onClose: vi.fn(),
      onProjectChanged,
      projectRoot: 'analytics',
      target: { kind: 'project' },
    });

    expect(workbench?.id).toBe('project-code');
    expect(workbench?.title).toBe('Project code');
    expect(workbench?.closeLabel).toBe('Close');
    expect(isValidElement(workbench?.panel)).toBe(true);
    const panel = workbench?.panel as ReactElement<SqlContextWorkbenchProps>;
    expect(panel.props.fileScope).toEqual({
      kind: 'dbt-project-files',
      projectRoot: 'analytics',
    });
    expect(panel.props.onFileSynchronized).toBe(onProjectChanged);
  });

  it('closes only after the Code buffer and project analysis are synchronized', async () => {
    const flush = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const workbenchRef = {
      current: { flush },
    } as RefObject<SqlContextWorkbenchHandle>;
    const onClose = vi.fn();
    const workbench = buildDbtProjectFileCodeWorkbench({
      copy,
      workbenchRef,
      onClose,
      onProjectChanged: vi.fn(async () => undefined),
      projectRoot: 'analytics',
      target: { kind: 'project' },
    });

    await workbench?.requestClose();
    expect(onClose).not.toHaveBeenCalled();

    await workbench?.requestClose();
    expect(onClose).toHaveBeenCalledOnce();
    expect(flush).toHaveBeenCalledTimes(2);
  });
});
