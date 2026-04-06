import { useQuery } from '@tanstack/react-query';
import { FileCode2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ViewHeader } from '../components/domain';
import { MonacoCodeViewer } from '../components/monaco/MonacoCodeViewer';
import { queryKeys } from '../queries/queryKeys';
import { useWorkspaceService } from '../services/AppServicesContext';
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
  const workspaceService = useWorkspaceService();
  const fileTreeQuery = useQuery({
    queryKey: queryKeys.workspace.fileTree(),
    queryFn: () => workspaceService.listFiles(),
  });
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const resolvedPath = useMemo(
    () => selectedPath ?? firstFilePath(fileTreeQuery.data ?? []),
    [fileTreeQuery.data, selectedPath]
  );
  const fileContentQuery = useQuery({
    enabled: resolvedPath != null,
    queryKey: queryKeys.workspace.fileContent(resolvedPath ?? ''),
    queryFn: () => workspaceService.getFileContent(resolvedPath ?? ''),
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-50">
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <ViewHeader
          className="border-0 bg-transparent px-0 py-0"
          title="Code"
          icon={<FileCode2 className="size-6 text-blue-400" />}
          subtitle="Browse workspace files and preview source content read-only."
        />
      </div>

      <div className="flex min-h-0 flex-1">
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

        <div className="min-w-0 flex-1">
          {fileTreeQuery.isPending ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Loading workspace files…
            </div>
          ) : fileTreeQuery.isError ? (
            <div className="flex h-full items-center justify-center text-sm text-red-300">
              Unable to load workspace files.
            </div>
          ) : fileContentQuery.isPending ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Loading file preview…
            </div>
          ) : fileContentQuery.isError || !fileContentQuery.data ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Select a file to preview its contents.
            </div>
          ) : (
            <MonacoCodeViewer
              ariaLabel={`Previewing ${fileContentQuery.data.name}`}
              language={fileContentQuery.data.language}
              path={fileContentQuery.data.path}
              value={fileContentQuery.data.content}
            />
          )}
        </div>
      </div>
    </div>
  );
}
