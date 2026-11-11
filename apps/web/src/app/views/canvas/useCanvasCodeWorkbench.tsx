/**
 * Owned concern: adapt the project Code editor lifecycle to the existing contextual workbench contract.
 * @baseline GH-3765: Code navigation is direct; pending drafts retain their existing guards.
 * @decision Capture the Code rail opener through the existing focus lifecycle.
 * @consequence Closing code restores its opener without creating a new editor or navigation rail.
 * @version 1.0.0
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkspaceScope } from '../../ports/sessionContext';
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
  workspaceCommands?: CanvasShellWorkspaceCommands,
  workspaceScope?: WorkspaceScope
) {
  const id = useCanvasInteractionStore((state) => state.contextualWorkbenchId);
  const owner = useCanvasInteractionStore((state) => state.contextualWorkbenchOwnerKey);
  const open = useCanvasInteractionStore((state) => state.openContextualWorkbench);
  const close = useCanvasInteractionStore((state) => state.closeContextualWorkbench);
  // Before the first Canvas, files still belong to the admitted project. No graph is created.
  const ownerKey =
    canvasId != null && layout.surfaceStrategy != null
      ? `${layout.surfaceStrategy.id}:${canvasId}`
      : workspaceScope == null
        ? null
        : JSON.stringify([
            'project-files',
            workspaceScope.tenantId,
            workspaceScope.projectId,
            workspaceScope.environmentId,
          ]);
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
            requestClose: async (isCurrent) => {
              const flushed = (await editorRef.current?.flush()) ?? true;
              if (!flushed || isCurrent?.() === false) return false;
              close();
              return true;
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
              requestClose: async (isCurrent?: () => boolean) => {
                const intent = ++activationIntent.current;
                const canClose = (): boolean =>
                  intent === activationIntent.current && isCurrent?.() !== false;
                try {
                  const closed = await selected.requestClose(canClose);
                  if (!closed || !canClose()) return false;
                  setActiveOwnerKey(null);
                  if (selected.id === 'project-code') enter(`#${canvasWorkspaceTabs.canvas.tabId}`);
                  else restore();
                  return true;
                } catch {
                  return false;
                }
              },
            },
          },
    [layout, selected, enter, restore]
  );
  const openProjectCode = useCallback(
    async (path?: string): Promise<boolean> => {
      const intent = ++activationIntent.current;
      const focusedBeforeAdmission = document.activeElement;
      capture('[data-slot="shell-project-code-command"]');
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
    available: ownerKey != null,
    layout: shellLayout,
    openProjectCode,
    showCanvas,
    active: activeOwnerKey === ownerKey && selected?.id === 'project-code',
  };
}
