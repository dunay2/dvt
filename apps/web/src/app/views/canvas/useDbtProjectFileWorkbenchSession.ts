/** Owned concern: retain one file workbench session and guard editor-to-inspector handoff. */
import { useCallback, useRef, useState } from 'react';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceFileCodeEditorHandle } from '../code/WorkspaceFileCodeEditor';
import type { SqlContextWorkbenchHandle, SqlContextWorkbenchProps } from './SqlContextWorkbench';

type InspectorTab = Parameters<NonNullable<DbtNodeData['onInspectNode']>>[1];

export function useDbtProjectFileWorkbenchSession({
  nodesById,
  setInspectorNode,
  showInspectorPanel,
  hideInspectorPanel,
}: Readonly<{
  nodesById: ReadonlyMap<string, CanonicalNode>;
  setInspectorNode: (nodeId: string, preferredTabId: InspectorTab) => void;
  showInspectorPanel: () => void;
  hideInspectorPanel: () => void;
}>) {
  const [projectCodeWorkbenchOpen, setProjectCodeWorkbenchOpen] = useState(false);
  const [projectCodeFileSelectionRequest, setProjectCodeFileSelectionRequest] =
    useState<SqlContextWorkbenchProps['fileSelectionRequest']>();
  const nodeCodeEditorRef = useRef<WorkspaceFileCodeEditorHandle>(null);
  const projectCodeEditorRef = useRef<SqlContextWorkbenchHandle>(null);
  const flushActiveNodeCode = useCallback(
    async (): Promise<boolean> => (await nodeCodeEditorRef.current?.flush()) ?? true,
    []
  );
  const openNodeWorkbench = useCallback(
    async (nodeId: string, preferredTabId?: InspectorTab): Promise<void> => {
      if (
        !nodesById.has(nodeId) ||
        !(await flushActiveNodeCode()) ||
        (await projectCodeEditorRef.current?.flush()) === false
      )
        return;
      setProjectCodeWorkbenchOpen(false);
      setInspectorNode(nodeId, preferredTabId ?? 'general');
      showInspectorPanel();
    },
    [nodesById, flushActiveNodeCode, setInspectorNode, showInspectorPanel]
  );
  const openProjectCode = useCallback(
    async (initialPath?: string): Promise<boolean> => {
      if (!(await flushActiveNodeCode())) return false;
      if (initialPath !== undefined || !projectCodeWorkbenchOpen) {
        setProjectCodeFileSelectionRequest(
          initialPath === undefined ? undefined : { path: initialPath }
        );
      }
      setProjectCodeWorkbenchOpen(true);
      return true;
    },
    [flushActiveNodeCode, projectCodeWorkbenchOpen]
  );
  const closeCodeWorkbench = useCallback(() => setProjectCodeWorkbenchOpen(false), []);
  const closeNodeWorkbench = useCallback(async (): Promise<void> => {
    if (await flushActiveNodeCode()) hideInspectorPanel();
  }, [flushActiveNodeCode, hideInspectorPanel]);
  return {
    nodeCodeEditorRef,
    projectCodeEditorRef,
    projectCodeWorkbenchOpen,
    projectCodeFileSelectionRequest,
    openNodeWorkbench,
    openProjectCode,
    closeCodeWorkbench,
    closeNodeWorkbench,
  };
}
