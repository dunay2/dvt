import { isValidElement, type ReactElement, type RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildDbtProjectFileCodeWorkbench } from './dbtProjectFileCodeWorkbench';
import type { SqlContextWorkbenchHandle, SqlContextWorkbenchProps } from './SqlContextWorkbench';

const copy = {
  nodeWorkbenchCloseLabel: 'Close',
  sqlContextWorkbenchMoveLabel: 'Move code workbench',
  sqlContextWorkbenchProjectTitle: 'Project code',
};

describe('buildDbtProjectFileCodeWorkbench', () => {
  it.each([undefined, 'analytics/models/marts/orders.sql'])(
    'opens the actual project root with the requested path %s',
    (initialPath) => {
      const fileSelectionRequest = initialPath === undefined ? undefined : { path: initialPath };
      const reconcilePersistedFile = vi.fn(async () => ({
        kind: 'fresh' as const,
        analysisSha256: 'a'.repeat(64),
        projectContentSetSha256: 'b'.repeat(64),
      }));
      const workbench = buildDbtProjectFileCodeWorkbench({
        copy,
        workbenchRef: { current: null },
        onClose: vi.fn(),
        reconcilePersistedFile,
        projectRoot: 'analytics',
        initialPath,
        fileSelectionRequest,
        open: true,
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
      expect(panel.props.reconcilePersistedFile).toBe(reconcilePersistedFile);
      expect(panel.props.initialPath).toBe(initialPath);
      expect(panel.props.fileSelectionRequest).toBe(fileSelectionRequest);
      expect(panel.props.presentation).toBe('project-workspace');
    }
  );

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
      reconcilePersistedFile: vi.fn(async () => ({
        kind: 'fresh' as const,
        analysisSha256: 'a'.repeat(64),
        projectContentSetSha256: 'b'.repeat(64),
      })),
      projectRoot: 'analytics',
      open: true,
    });

    await expect(workbench?.requestClose()).resolves.toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    await expect(workbench?.requestClose()).resolves.toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    expect(flush).toHaveBeenCalledTimes(2);
  });
});
