/**
 * Owned concern: adapt the project Code editor lifecycle to the existing contextual workbench contract.
 * @baseline GH-3622: File now owns the code opener; pending drafts retain their existing guards.
 * @decision Capture the File trigger through the existing focus lifecycle.
 * @consequence Closing code restores its opener without creating a new editor or navigation rail.
 * @version 1.0.0
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type {
  CanvasShellContextualWorkbench,
  CanvasShellLayout,
  CanvasShellWorkspaceCommands,
} from './canvasShell.types';
import { SqlContextWorkbench, type SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import type { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';

export function useCanvasCodeWorkbench(
  layout: CanvasShellLayout,
  canvasId: string | null,
  copy: ReturnType<typeof resolveCanvasViewCopy>,
  focus: ReturnType<typeof useCanvasWorkbenchFocus>,
  workspaceCommands?: CanvasShellWorkspaceCommands
) {
  const id = useCanvasInteractionStore((state) => state.contextualWorkbenchId);
  const owner = useCanvasInteractionStore((state) => state.contextualWorkbenchOwnerKey);
  const open = useCanvasInteractionStore((state) => state.openContextualWorkbench);
  const close = useCanvasInteractionStore((state) => state.closeContextualWorkbench);
  const ownerKey =
    layout.surfaceStrategy == null || canvasId == null
      ? null
      : `${layout.surfaceStrategy.id}:${canvasId}`;
  const scopedId = owner === ownerKey ? id : null;
  const editorRef = useRef<SqlContextWorkbenchHandle>(null);
  const [initialPath, setInitialPath] = useState<string | undefined>();
  const { capture, restore } = focus;
  useEffect(() => {
    if (id != null && scopedId == null) close();
  }, [id, scopedId, close]);
  const internal = useMemo<CanvasShellContextualWorkbench | undefined>(
    () =>
      scopedId !== 'project-code'
        ? undefined
        : {
            id: 'project-code',
            title: copy.sqlContextWorkbenchProjectTitle,
            closeLabel: copy.nodeWorkbenchCloseLabel,
            moveLabel: copy.sqlContextWorkbenchMoveLabel,
            description: copy.sqlContextWorkbenchProjectDescription,
            requestClose: async () => {
              const flushed = (await editorRef.current?.flush()) ?? true;
              if (flushed) close();
              return flushed;
            },
            panel: (
              <SqlContextWorkbench
                ref={editorRef}
                fileScope={{ kind: 'workspace-files' }}
                initialPath={initialPath}
              />
            ),
          },
    [
      scopedId,
      copy.sqlContextWorkbenchProjectTitle,
      copy.nodeWorkbenchCloseLabel,
      copy.sqlContextWorkbenchMoveLabel,
      copy.sqlContextWorkbenchProjectDescription,
      close,
      initialPath,
    ]
  );
  const selected = layout.contextualWorkbench ?? internal;
  const shellLayout = useMemo(
    () =>
      selected == null
        ? layout
        : {
            ...layout,
            contextualWorkbench: {
              ...selected,
              requestClose: async () => {
                const closed = await selected.requestClose();
                if (closed) restore();
                return closed;
              },
            },
          },
    [layout, selected, restore]
  );
  const openProjectCode = useCallback(
    (path?: string) => {
      capture('[data-slot="shell-file-menu-trigger"]');
      if (workspaceCommands?.onOpenProjectCode != null) workspaceCommands.onOpenProjectCode(path);
      else if (ownerKey != null) {
        setInitialPath(path);
        open('project-code', ownerKey);
      }
    },
    [capture, workspaceCommands?.onOpenProjectCode, ownerKey, open]
  );
  return { layout: shellLayout, openProjectCode };
}
