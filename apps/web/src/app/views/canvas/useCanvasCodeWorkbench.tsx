/** Adapt the project Code editor lifecycle to the existing contextual workbench contract. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
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
            panel: <SqlContextWorkbench ref={editorRef} />,
          },
    [
      scopedId,
      copy.sqlContextWorkbenchProjectTitle,
      copy.nodeWorkbenchCloseLabel,
      copy.sqlContextWorkbenchMoveLabel,
      copy.sqlContextWorkbenchProjectDescription,
      close,
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
  const openProjectCode = useCallback(() => {
    capture('[data-slot="shell-workspace-menu-trigger"]');
    if (workspaceCommands?.onOpenProjectCode != null) workspaceCommands.onOpenProjectCode();
    else if (ownerKey != null) open('project-code', ownerKey);
  }, [capture, workspaceCommands?.onOpenProjectCode, ownerKey, open]);
  return { layout: shellLayout, openProjectCode };
}
