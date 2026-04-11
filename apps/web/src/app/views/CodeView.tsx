import { FileCode2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ViewHeader } from '../components/domain';
import { WorkbenchReadOnlyState } from '../components/workbench/state/WorkbenchStates';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { MonacoCodeViewer } from '../components/monaco/MonacoCodeViewer';
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileTreeQuery,
} from '../queries/workspaceQueries';
import type { WorkspaceFileEntry } from '../ports/workspace';
import FileTreePanel from './code/FileTreePanel';

function flattenFiles(entries: WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return entries.flatMap((entry) =>
    entry.kind === 'file' ? [entry] : entry.children ? flattenFiles(entry.children) : []
  );
}

function firstFilePath(entries: WorkspaceFileEntry[]): string | undefined {
  return flattenFiles(entries)[0]?.path;
}

export default function CodeView() {
  const fileTreeQuery = useWorkspaceFileTreeQuery();
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const resolvedPath = useMemo(
    () => selectedPath ?? firstFilePath(fileTreeQuery.data ?? []),
    [fileTreeQuery.data, selectedPath]
  );
  const fileContentQuery = useWorkspaceFileContentQuery(resolvedPath);
  const previewPane = fileTreeQuery.isPending ? (
    <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
      Loading workspace files...
    </div>
  ) : fileTreeQuery.isError ? (
    <div className="flex h-full items-center justify-center text-sm text-[var(--status-danger)]">
      Unable to load workspace files.
    </div>
  ) : fileContentQuery.isPending ? (
    <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
      Loading file preview...
    </div>
  ) : fileContentQuery.isError || !fileContentQuery.data ? (
    <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
      Select a file to preview its contents.
    </div>
  ) : (
    <MonacoCodeViewer
      ariaLabel={`Previewing ${fileContentQuery.data.name}`}
      language={fileContentQuery.data.language}
      path={fileContentQuery.data.path}
      value={fileContentQuery.data.content}
    />
  );

  return (
    <RouteWorkbenchFrame
      scroll={false}
      bodyClassName="flex min-h-0 flex-1"
      header={
        <div className={routeWorkbenchHeaderBandClassName}>
          <ViewHeader
            className="border-0 bg-transparent px-0 py-0"
            title="Code"
            icon={<FileCode2 className="size-6 text-[var(--status-info)]" />}
            subtitle="Browse workspace files and preview source content read-only."
          />
        </div>
      }
    >
      <div className="w-80 shrink-0">
        <FileTreePanel
          tree={fileTreeQuery.data ?? []}
          selectedPath={resolvedPath}
          onSelect={(entry) => {
            if (entry.kind === 'file') {
              setSelectedPath(entry.path);
            }
          }}
        />
      </div>

      <div className="min-w-0 flex flex-1 flex-col">
        <div className="shrink-0 p-4 pb-0">
          <WorkbenchReadOnlyState
            dataSlot="code-readonly-state"
            title="Read-only preview"
            message="Browse workspace files here and hand off revision comparison to Diff."
            note="Editing is not available in the Code route."
          />
        </div>
        <div className="min-h-0 flex-1 p-4">{previewPane}</div>
      </div>
    </RouteWorkbenchFrame>
  );
}
