import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildDbtProjectFileCodeWorkbench } from './dbtProjectFileCodeWorkbench';
import type { SqlContextWorkbenchProps } from './SqlContextWorkbench';

const copy = {
  sqlContextWorkbenchLoadingMessage: 'Loading code',
  sqlContextWorkbenchNodeTitle: 'Node code',
  sqlContextWorkbenchProjectTitle: 'Project code',
};

describe('buildDbtProjectFileCodeWorkbench', () => {
  it('targets the exact SQL file owned by the selected DBT node', () => {
    const workbench = buildDbtProjectFileCodeWorkbench({
      copy,
      onClose: vi.fn(),
      projectRoot: 'analytics',
      target: {
        kind: 'node',
        nodeId: 'model.analytics.orders',
        initialPath: 'analytics/models/marts/orders.sql',
      },
    });

    expect(workbench?.id).toBe('node-code');
    expect(workbench?.title).toBe('Node code');
    expect(workbench?.description).toBe('analytics/models/marts/orders.sql');
    expect(isValidElement(workbench?.panel)).toBe(true);
    const panel = workbench?.panel as ReactElement<SqlContextWorkbenchProps>;
    expect(panel.props.fileScope).toEqual({
      kind: 'dbt-project-files',
      projectRoot: 'analytics',
      initialPath: 'analytics/models/marts/orders.sql',
    });
  });

  it('opens the project scope without fabricating a selected file', () => {
    const workbench = buildDbtProjectFileCodeWorkbench({
      copy,
      onClose: vi.fn(),
      projectRoot: 'analytics',
      target: { kind: 'project' },
    });

    expect(workbench?.id).toBe('project-code');
    expect(workbench?.title).toBe('Project code');
    expect(isValidElement(workbench?.panel)).toBe(true);
    const panel = workbench?.panel as ReactElement<SqlContextWorkbenchProps>;
    expect(panel.props.fileScope).toEqual({
      kind: 'dbt-project-files',
      projectRoot: 'analytics',
    });
  });
});
