/** Owned concern: present contextual facts for the selected canonical relation node. */
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export function CanvasRelationalTreeNodeDetail({
  node,
  copy,
}: Readonly<{
  node: CanvasRelationalTreeNode | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
}>): JSX.Element {
  return (
    <section
      data-slot="canvas-relational-tree-detail"
      aria-label={copy.relationalTreeDetailLabel}
      className="min-h-0 overflow-auto border-t border-(--border-subtle) p-3"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
        {copy.relationalTreeDetailLabel}
      </h3>
      {node == null ? null : (
        <dl className="mt-3 grid gap-3 text-[11px]">
          <div>
            <dt className="text-(--text-muted)">Substrait</dt>
            <dd className="font-mono font-semibold uppercase text-(--text-primary)">
              {node.operator.toUpperCase()}
            </dd>
          </div>
          <div>
            <dt className="text-(--text-muted)">{copy.nodePresentationColumnsLabel}</dt>
            <dd className="font-mono text-(--text-primary)">{node.output.fields.length}</dd>
          </div>
          {node.relationId == null ? null : (
            <div>
              <dt className="text-(--text-muted)">relationId</dt>
              <dd className="break-all font-mono text-(--text-primary)">{node.relationId}</dd>
            </div>
          )}
          {node.expressionRefs.length === 0 ? null : (
            <div>
              <dt className="text-(--text-muted)">Expressions</dt>
              <dd className="font-mono text-(--text-primary)">{node.expressionRefs.length}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="mt-4 border-t border-(--border-subtle) pt-3 text-[10px] text-(--text-muted)">
        {copy.relationalTreeReadOnlyMessage}
      </p>
    </section>
  );
}
