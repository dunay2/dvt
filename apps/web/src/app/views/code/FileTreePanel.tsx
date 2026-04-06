import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useState } from 'react';

import type { WorkspaceFileEntry } from '../../ports/workspace';
import { cn } from '../../components/ui/utils';

type FileTreePanelProps = {
  readonly tree: WorkspaceFileEntry[];
  readonly selectedPath?: string;
  readonly onSelect: (entry: WorkspaceFileEntry) => void;
};

function FileTreeNode({
  entry,
  depth,
  selectedPath,
  onSelect,
}: {
  entry: WorkspaceFileEntry;
  depth: number;
  selectedPath?: string;
  onSelect: (entry: WorkspaceFileEntry) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isDirectory = entry.kind === 'directory';
  const isSelected = entry.path === selectedPath;

  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors',
          isSelected && 'bg-slate-800 text-white',
          depth === 0 && 'pl-2',
          depth === 1 && 'pl-5',
          depth === 2 && 'pl-8',
          depth >= 3 && 'pl-11'
        )}
        onClick={() => {
          if (isDirectory) {
            setExpanded((prev) => !prev);
          } else {
            onSelect(entry);
          }
        }}
      >
        {isDirectory ? (
          expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-slate-400" />
          )
        ) : (
          <File className="size-3.5 shrink-0 text-slate-500" />
        )}
        {isDirectory && <Folder className="size-3.5 shrink-0 text-blue-400" />}
        <span className="truncate">{entry.name}</span>
      </button>
      {isDirectory && expanded && entry.children?.map((child) => (
        <FileTreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default function FileTreePanel({ tree, selectedPath, onSelect }: FileTreePanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-slate-900 border-r border-slate-700 py-2">
      <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Explorer
      </div>
      {tree.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
