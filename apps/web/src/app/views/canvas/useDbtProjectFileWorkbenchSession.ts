/** Owned concern: retain one file workbench session and guard editor-to-inspector handoff. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceFileCodeEditorHandle } from '../code/WorkspaceFileCodeEditor';
import type { SqlContextWorkbenchHandle, SqlContextWorkbenchProps } from './SqlContextWorkbench';

type InspectorTab = Parameters<NonNullable<DbtNodeData['onInspectNode']>>[1];
type SessionOwner = Readonly<{ key: string }>;
type ProjectCodeSession = Readonly<{
  owner: SessionOwner;
  open: boolean;
  fileSelectionRequest: SqlContextWorkbenchProps['fileSelectionRequest'];
}>;
type FlushableEditor = Pick<WorkspaceFileCodeEditorHandle, 'flush'>;

async function flushCapturedEditors(
  editors: readonly (FlushableEditor | null)[],
  isCurrent: () => boolean
): Promise<boolean> {
  for (const editor of editors) {
    if (!isCurrent()) return false;
    try {
      const admitted = await editor?.flush();
      if (!isCurrent() || admitted === false) return false;
    } catch (error) {
      // The current caller owns visible save failures; an abandoned owner must not report into its successor.
      if (!isCurrent()) return false;
      throw error;
    }
  }
  return true;
}

export function useDbtProjectFileWorkbenchSession({
  ownerKey,
  nodesById,
  setInspectorNode,
  showInspectorPanel,
  hideInspectorPanel,
}: Readonly<{
  ownerKey: string;
  nodesById: ReadonlyMap<string, CanonicalNode>;
  setInspectorNode: (nodeId: string, preferredTabId: InspectorTab) => void | boolean;
  showInspectorPanel: () => void;
  hideInspectorPanel: () => void;
}>) {
  // A fresh identity for A -> B -> A prevents old A completions or file selections from reappearing.
  const owner = useMemo<SessionOwner>(() => ({ key: ownerKey }), [ownerKey]);
  const [projectCodeSession, setProjectCodeSession] = useState<ProjectCodeSession>(() => ({
    owner,
    open: false,
    fileSelectionRequest: undefined,
  }));
  const mounted = useRef(true);
  const intentGeneration = useRef(0);
  const latest = useRef({
    owner,
    nodesById,
    setInspectorNode,
    showInspectorPanel,
    hideInspectorPanel,
  });
  latest.current = { owner, nodesById, setInspectorNode, showInspectorPanel, hideInspectorPanel };
  const nodeCodeEditorRef = useRef<WorkspaceFileCodeEditorHandle>(null);
  const projectCodeEditorRef = useRef<SqlContextWorkbenchHandle>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      intentGeneration.current += 1;
    };
  }, []);

  const beginHandoff = useCallback(
    (nodeId?: string) => {
      if (!mounted.current || latest.current.owner !== owner) return null;
      const generation = ++intentGeneration.current;
      const isCurrent = (): boolean =>
        mounted.current &&
        latest.current.owner === owner &&
        intentGeneration.current === generation &&
        (nodeId == null || latest.current.nodesById.has(nodeId));
      if (!isCurrent()) return null;
      return {
        isCurrent,
        nodeEditor: nodeCodeEditorRef.current,
        projectEditor: projectCodeEditorRef.current,
      };
    },
    [owner]
  );

  const closeProjectCode = useCallback(
    (isCurrent: () => boolean): void => {
      setProjectCodeSession((current) =>
        isCurrent()
          ? {
              owner,
              open: false,
              fileSelectionRequest:
                current.owner === owner ? current.fileSelectionRequest : undefined,
            }
          : current
      );
    },
    [owner]
  );

  const openNodeWorkbench = useCallback(
    async (nodeId: string, preferredTabId?: InspectorTab): Promise<boolean> => {
      const handoff = beginHandoff(nodeId);
      if (
        handoff == null ||
        !(await flushCapturedEditors(
          [handoff.nodeEditor, handoff.projectEditor],
          handoff.isCurrent
        )) ||
        !handoff.isCurrent()
      )
        return false;
      if (latest.current.setInspectorNode(nodeId, preferredTabId ?? 'general') === false)
        return false;
      closeProjectCode(handoff.isCurrent);
      latest.current.showInspectorPanel();
      return true;
    },
    [beginHandoff, closeProjectCode]
  );
  const openProjectCode = useCallback(
    async (initialPath?: string): Promise<boolean> => {
      const handoff = beginHandoff();
      if (
        handoff == null ||
        !(await flushCapturedEditors([handoff.nodeEditor], handoff.isCurrent)) ||
        !handoff.isCurrent()
      )
        return false;
      setProjectCodeSession((current) => {
        if (!handoff.isCurrent()) return current;
        return {
          owner,
          open: true,
          fileSelectionRequest:
            initialPath !== undefined
              ? { path: initialPath }
              : current.owner === owner && current.open
                ? current.fileSelectionRequest
                : undefined,
        };
      });
      return true;
    },
    [beginHandoff, owner]
  );
  const closeCodeWorkbench = useCallback((): boolean => {
    const handoff = beginHandoff();
    if (handoff == null) return false;
    closeProjectCode(handoff.isCurrent);
    return true;
  }, [beginHandoff, closeProjectCode]);
  const closeNodeWorkbench = useCallback(async (): Promise<boolean> => {
    const handoff = beginHandoff();
    if (
      handoff == null ||
      !(await flushCapturedEditors([handoff.nodeEditor], handoff.isCurrent)) ||
      !handoff.isCurrent()
    )
      return false;
    latest.current.hideInspectorPanel();
    return true;
  }, [beginHandoff]);
  return {
    nodeCodeEditorRef,
    projectCodeEditorRef,
    projectCodeWorkbenchOpen: projectCodeSession.owner === owner && projectCodeSession.open,
    projectCodeFileSelectionRequest:
      projectCodeSession.owner === owner ? projectCodeSession.fileSelectionRequest : undefined,
    openNodeWorkbench,
    openProjectCode,
    closeCodeWorkbench,
    closeNodeWorkbench,
  };
}
