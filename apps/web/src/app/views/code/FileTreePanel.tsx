import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useState } from 'react';

import type { WorkspaceFileEntry } from '../../ports/workspace';
import { cn } from '../../components/ui/utils';

type FileTreePanelProps = {
  readonly title: string;
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
        data-slot="code-workspace-file-entry"
        data-workspace-path={entry.path}
        className={cn(
          'flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--text-default)] transition-colors hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)]',
          isSelected && 'bg-[var(--surface-selected)] text-[var(--text-strong)]',
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
            <ChevronDown className="size-3.5 shrink-0 text-[var(--text-subtle)]" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-[var(--text-subtle)]" />
          )
        ) : (
          <File className="size-3.5 shrink-0 text-[var(--text-disabled)]" />
        )}
        {isDirectory && <Folder className="size-3.5 shrink-0 text-[var(--status-info)]" />}
        <span className="truncate">{entry.name}</span>
      </button>
      {isDirectory &&
        expanded &&
        entry.children?.map((child) => (
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

export default function FileTreePanel({ title, tree, selectedPath, onSelect }: FileTreePanelProps) {
  return (
    <div className="h-full overflow-y-auto border-r border-[color:var(--border-default)] bg-[var(--surface-panel)] py-2">
      <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)]">
        {title}
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
