/** Owned concern: present contextual facts for the selected canonical relation node. */
import { GitMerge, Layers3, Table2 } from 'lucide-react';

import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

function childRoleLabel(
  role: CanvasRelationalTreeNode['children'][number]['role'],
  copy: CanvasRelationalTreeWorkbenchCopy
): string {
  if (role === 'left') return copy.inspectorDvtRelationalLeftInput;
  if (role === 'right') return copy.inspectorDvtRelationalRightInput;
  return copy.inspectorDbtOriginLabel;
}

export function CanvasRelationalTreeNodeDetail({
  node,
  copy,
}: Readonly<{
  node: CanvasRelationalTreeNode | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
}>): JSX.Element {
  const Icon = node?.operator === 'read' ? Table2 : node?.operator === 'join' ? GitMerge : Layers3;
  return (
    <aside
      data-slot="canvas-relational-tree-detail"
      data-position="contextual"
      aria-label={copy.relationalTreeDetailLabel}
      className="min-h-0 overflow-auto border-t border-(--border-subtle) bg-(--surface-panel) p-4 md:border-t-0 md:border-l"
    >
      {node == null ? null : (
        <>
          <header className="flex items-center gap-2 border-b border-(--border-subtle) pb-3">
            <Icon aria-hidden="true" className="size-4 text-(--status-info)" />
            <span className="text-xs font-semibold uppercase tracking-wide text-(--text-primary)">
              {node.operator.toUpperCase()}
            </span>
          </header>
          <dl className="mt-4 space-y-4 text-[11px]">
            <div>
              <dt className="text-(--text-muted)">{copy.inspectorDbtOriginLabel}</dt>
              <dd className="mt-1 break-all font-mono text-(--text-primary)">
                {node.displayName ?? node.sourceRef?.sourceObjectId ?? node.substraitKind}
              </dd>
            </div>
            <div>
              <dt className="text-(--text-muted)">{copy.nodePresentationColumnsLabel}</dt>
              <dd className="mt-1 font-mono text-(--text-primary)">{node.output.fields.length}</dd>
            </div>
            {node.expressionRefs.length === 0 ? null : (
              <div>
                <dt className="text-(--text-muted)">Expressions</dt>
                <dd className="mt-1 font-mono text-(--text-primary)">
                  {node.expressionRefs.length}
                </dd>
              </div>
            )}
            {node.children.map((child) => (
              <div key={`${child.role}:${child.ordinal}`}>
                <dt className="text-(--text-muted)">{childRoleLabel(child.role, copy)}</dt>
                <dd className="mt-1 break-all font-mono text-(--text-primary)">
                  {child.node.displayName ??
                    child.node.sourceRef?.sourceObjectId ??
                    child.node.substraitKind}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 border-t border-(--border-subtle) pt-3 text-[10px] leading-relaxed text-(--text-muted)">
            {copy.relationalTreeReadOnlyMessage}
          </p>
        </>
      )}
    </aside>
  );
}
