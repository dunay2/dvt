import { Command, Database, GitBranch, PanelsTopLeft, PlayCircle } from 'lucide-react';

import { resolveDataSource } from '../../services/config/dataSource';
import { useAppStore } from '../../stores/appStore';
import type { CanonicalNode } from '../../types/canonical';
import type { EditorTab } from './workbenchTypes';

interface WorkbenchStatusBarProps {
  activeTab: EditorTab | null;
  selectedNode: CanonicalNode | null;
  activeRunId: string | null;
}

export default function WorkbenchStatusBar({
  activeTab,
  selectedNode,
  activeRunId,
}: WorkbenchStatusBarProps) {
  const { selectedTenant, selectedProject, selectedEnvironment, gitBranch, gitSha } = useAppStore();
  const dataSourceMode = resolveDataSource();

  return (
    <div className="flex h-6 items-center justify-between bg-[#007acc] px-3 text-[11px] text-white">
      <div className="flex min-w-0 items-center gap-4 overflow-hidden">
        <span className="flex items-center gap-1.5">
          <Database className="size-3.5" />
          {selectedTenant}/{selectedProject}/{selectedEnvironment}
        </span>

        <span className="flex items-center gap-1.5">
          <GitBranch className="size-3.5" />
          {gitBranch}@{gitSha}
        </span>

        {selectedNode ? <span className="truncate">node: {selectedNode.name}</span> : null}

        {activeRunId ? (
          <span className="flex items-center gap-1.5">
            <PlayCircle className="size-3.5" />
            {activeRunId}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className="flex items-center gap-1.5">
          <PanelsTopLeft className="size-3.5" />
          {activeTab?.kind ?? 'graph'}
        </span>
        <span>{activeTab?.language ?? 'graph'}</span>
        <span>{dataSourceMode}</span>
        <span className="flex items-center gap-1.5">
          <Command className="size-3.5" />
          ⌘/Ctrl+P
        </span>
      </div>
    </div>
  );
}
