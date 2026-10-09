/** Owned concern: readable card content and accessible semantic input roles. */
import { resolveCanvasRelationalNodeCopy } from './canvasRelationalNodePresentation';
import type { CanvasRelationalTreePlacedNode } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import styles from './CanvasRelationalTreeCard.module.css';

export function CanvasRelationalTreeNodeButton({
  placed,
  selected,
  copy,
  detailed,
  movable,
  pending = false,
  pendingReason,
  hideDetail = false,
  onSelect,
  onExpand,
  onDelete,
}: Readonly<{
  placed: CanvasRelationalTreePlacedNode;
  selected: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  detailed: boolean;
  movable: boolean;
  pending?: boolean;
  pendingReason?: string;
  hideDetail?: boolean;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  onDelete?: () => void;
}>): JSX.Element {
  const { node, role } = placed;
  const roleLabel =
    role == null
      ? null
      : role === 'left'
        ? copy.inspectorDvtRelationalLeftInput
        : role === 'right'
          ? copy.inspectorDvtRelationalRightInput
          : role === 'primary'
            ? copy.relationalTreePrimaryInputLabel
            : role === 'secondary'
              ? copy.relationalTreeSecondaryInputTemplate.replace(
                  '{ordinal}',
                  String(placed.ordinal + 1)
                )
              : copy.inspectorDbtOriginLabel;
  const isSource = node.operator === 'read';
  const { operation, presentation, title, detail } = resolveCanvasRelationalNodeCopy(node, copy);
  const Icon = presentation.icon;
  return (
    <button
      type="button"
      draggable={false}
      role="treeitem"
      aria-level={placed.level}
      aria-posinset={placed.ordinal + 1}
      aria-setsize={placed.siblingCount}
      aria-selected={selected}
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"
      aria-expanded={node.children.length === 0 ? undefined : true}
      aria-label={roleLabel == null ? title : `${roleLabel}: ${title}`}
      data-slot="canvas-relational-tree-node"
      data-locator={node.locator}
      data-relational-card-id={node.relationId ?? node.locator}
      data-relation-id={node.relationId ?? undefined}
      data-operator={node.operator}
      data-pending={pending || undefined}
      data-presentation={operation}
      data-category={presentation.category}
      data-detailed={detailed}
      data-movable={movable}
      onClick={() => {
        onSelect(node.locator);
        onExpand?.(node.locator);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Delete' && event.key !== 'Backspace') return;
        if (onDelete == null) return;
        event.preventDefault();
        event.stopPropagation();
        onDelete();
      }}
      className={styles.nodeButton}
    >
      <span className={styles.identity}>
        <Icon aria-hidden="true" className={styles.icon} />
        <span data-slot="canvas-relational-node-title" title={title} className={styles.title}>
          {title}
        </span>
      </span>
      {pending ? (
        <span className={styles.pending}>{pendingReason ?? copy.relationalTreePendingLabel}</span>
      ) : isSource || hideDetail ? null : (
        <span title={detail} className={styles.detail}>
          {detail}
        </span>
      )}
      {roleLabel == null ? null : <span className="sr-only">{roleLabel}</span>}
    </button>
  );
}
