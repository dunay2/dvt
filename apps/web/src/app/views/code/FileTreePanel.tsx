/** Owned concern: render the passive file tree and injected explorer commands with common visual tokens. */
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import type { WorkspaceFileEntry } from '../../ports/workspace';
import { cn } from '../../components/ui/utils';
import styles from './FileTreePanel.module.css';

type FileTreePanelProps = {
  readonly title: string;
  readonly tree: WorkspaceFileEntry[];
  readonly selectedPath?: string;
  readonly onSelect: (entry: WorkspaceFileEntry) => void;
  readonly onSelectDirectory?: (path: string) => void;
  readonly headerActions?: ReactNode;
  readonly stateMessage?: ReactNode;
};

function FileTreeNode({
  entry,
  depth,
  selectedPath,
  onSelect,
  onSelectDirectory,
}: {
  entry: WorkspaceFileEntry;
  depth: number;
  selectedPath?: string;
  onSelect: (entry: WorkspaceFileEntry) => void;
  onSelectDirectory?: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const childrenId = useId();
  const isDirectory = entry.kind === 'directory';
  const isSelected = entry.path === selectedPath;

  return (
    <div>
      <button
        type="button"
        data-slot="code-workspace-file-entry"
        data-workspace-path={entry.path}
        data-depth={Math.min(depth, 3)}
        aria-expanded={isDirectory ? expanded : undefined}
        aria-controls={isDirectory ? childrenId : undefined}
        title={entry.path}
        className={cn(styles.entry, isSelected && styles.selected)}
        onClick={() => {
          if (isDirectory) {
            setExpanded((prev) => !prev);
            onSelectDirectory?.(entry.path);
          } else {
            onSelect(entry);
          }
        }}
      >
        {isDirectory ? (
          expanded ? (
            <ChevronDown aria-hidden="true" className={styles.icon} />
          ) : (
            <ChevronRight aria-hidden="true" className={styles.icon} />
          )
        ) : (
          <File aria-hidden="true" className={cn(styles.icon, styles.fileIcon)} />
        )}
        {isDirectory && (
          <Folder aria-hidden="true" className={cn(styles.icon, styles.folderIcon)} />
        )}
        <span className={styles.name}>{entry.name}</span>
      </button>
      {isDirectory && (
        <div id={childrenId} hidden={!expanded}>
          {entry.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onSelectDirectory={onSelectDirectory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTreePanel({
  title,
  tree,
  selectedPath,
  onSelect,
  onSelectDirectory,
  headerActions,
  stateMessage,
}: FileTreePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.heading}>{title}</span>
        {headerActions}
      </div>
      {stateMessage ??
        tree.map((entry) => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
            onSelectDirectory={onSelectDirectory}
          />
        ))}
    </div>
  );
}
