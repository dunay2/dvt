/** Owned concern: present one deterministic, keyboard-selectable relational tree. */
import { useState } from 'react';

import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeZoomControls } from './CanvasRelationalTreeZoomControls';

function childRoleLabel(
  role: CanvasRelationalTreeChildRole,
  ordinal: number,
  copy: CanvasRelationalTreeWorkbenchCopy
): string {
  if (role === 'left') return copy.inspectorDvtRelationalLeftInput;
  if (role === 'right') return copy.inspectorDvtRelationalRightInput;
  if (role === 'primary') return copy.relationalTreePrimaryInputLabel;
  if (role === 'secondary') {
    return copy.relationalTreeSecondaryInputTemplate.replace('{ordinal}', String(ordinal + 1));
  }
  return copy.inspectorDbtOriginLabel;
}

function RelationalTreeItem({
  node,
  level,
  roleLabel,
  selectedLocator,
  copy,
  onSelect,
}: Readonly<{
  node: CanvasRelationalTreeNode;
  level: number;
  roleLabel?: string;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
}>): JSX.Element {
  return (
    <li role="none" className="mt-2">
      {roleLabel == null ? null : (
        <div className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-(--text-muted)">
          {roleLabel}
        </div>
      )}
      <button
        type="button"
        role="treeitem"
        aria-level={level}
        aria-selected={node.locator === selectedLocator}
        aria-expanded={node.children.length === 0 ? undefined : true}
        data-slot="canvas-relational-tree-node"
        data-locator={node.locator}
        onClick={() => onSelect(node.locator)}
        className="min-w-44 rounded border border-(--border-subtle) bg-(--surface-panel) px-3 py-2 text-left aria-selected:border-(--status-info) aria-selected:ring-1 aria-selected:ring-(--status-info)"
      >
        <span className="block text-[10px] font-bold uppercase tracking-wide text-(--status-info)">
          {node.operator.toUpperCase()}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10px] text-(--text-muted)">
          {node.displayName ?? node.relationId ?? node.substraitKind}
        </span>
      </button>
      {node.children.length === 0 ? null : (
        <ul role="group" className="ml-5 border-l border-(--border-subtle) pl-4">
          {node.children.map((child) => (
            <RelationalTreeItem
              key={`${node.locator}:${child.role}:${child.ordinal}`}
              node={child.node}
              level={level + 1}
              roleLabel={childRoleLabel(child.role, child.ordinal, copy)}
              selectedLocator={selectedLocator}
              copy={copy}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CanvasRelationalTreeView({
  root,
  selectedLocator,
  copy,
  onSelect,
}: Readonly<{
  root: CanvasRelationalTreeNode;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
}>): JSX.Element {
  const [zoom, setZoom] = useState(1);
  const changeZoom = (delta: number): void =>
    setZoom((current) => Math.min(1.5, Math.max(0.5, current + delta)));

  return (
    <section className="flex min-h-0 min-w-0 flex-col" aria-label={copy.relationalTreeLabel}>
      <header className="flex items-center justify-between gap-2 border-b border-(--border-subtle) px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
          {copy.relationalTreeLabel}
        </h3>
        <CanvasRelationalTreeZoomControls
          copy={copy}
          onChange={changeZoom}
          onFit={() => setZoom(0.75)}
        />
      </header>
      <div data-slot="canvas-relational-tree" className="min-h-64 flex-1 overflow-auto p-4">
        <div
          className="origin-top-left transition-transform"
          style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
        >
          <div className="inline-flex rounded border border-(--status-info) bg-(--surface-subtle) px-3 py-2 text-[10px] font-bold uppercase text-(--status-info)">
            {copy.relationalTreeOutputLabel}
          </div>
          <ul role="tree" aria-label={copy.relationalTreeLabel}>
            <RelationalTreeItem
              node={root}
              level={1}
              selectedLocator={selectedLocator}
              copy={copy}
              onSelect={onSelect}
            />
          </ul>
        </div>
      </div>
    </section>
  );
}
