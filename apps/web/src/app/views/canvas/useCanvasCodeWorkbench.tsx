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
import {
  SqlContextWorkbench,
  type SqlContextWorkbenchHandle,
  type SqlContextWorkbenchProps,
} from './SqlContextWorkbench';
import type { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';
import { canvasWorkspaceTabs } from './canvasWorkspaceTabs';

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
  const [activeOwnerKey, setActiveOwnerKey] = useState<string | null>(null);
  const activationIntent = useRef(0);
  const showCanvas = useCallback(() => {
    activationIntent.current += 1;
    setActiveOwnerKey(null);
  }, []);
  useEffect(
    () => () => {
      activationIntent.current += 1;
    },
    [ownerKey]
  );
  const editorRef = useRef<SqlContextWorkbenchHandle>(null);
  const [fileSelectionRequest, setFileSelectionRequest] =
    useState<SqlContextWorkbenchProps['fileSelectionRequest']>();
  const { capture, restore, enter } = focus;
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
                presentation="project-workspace"
                fileScope={{ kind: 'workspace-files' }}
                fileSelectionRequest={fileSelectionRequest}
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
      fileSelectionRequest,
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
    async (path?: string): Promise<boolean> => {
      const intent = ++activationIntent.current;
      const focusedBeforeAdmission = document.activeElement;
      capture('[data-slot="shell-file-menu-trigger"]');
      if (ownerKey == null) return false;
      try {
        if (workspaceCommands?.onOpenProjectCode != null) {
          if (!(await workspaceCommands.onOpenProjectCode(path))) return false;
        } else {
          if (path !== undefined || scopedId !== 'project-code') {
            setFileSelectionRequest(path === undefined ? undefined : { path });
          }
          open('project-code', ownerKey);
        }
        if (intent !== activationIntent.current) return false;
        setActiveOwnerKey(ownerKey);
        if (
          focusedBeforeAdmission?.id !== canvasWorkspaceTabs.code.tabId &&
          document.activeElement?.id !== canvasWorkspaceTabs.code.tabId &&
          (document.activeElement === focusedBeforeAdmission ||
            document.activeElement === document.body)
        ) {
          enter('[data-slot="canvas-code-workspace-surface"]');
        }
        return true;
      } catch {
        return false;
      }
    },
    [capture, enter, workspaceCommands?.onOpenProjectCode, ownerKey, scopedId, open]
  );
  return {
    layout: shellLayout,
    openProjectCode,
    showCanvas,
    active: activeOwnerKey === ownerKey && selected?.id === 'project-code',
  };
}
