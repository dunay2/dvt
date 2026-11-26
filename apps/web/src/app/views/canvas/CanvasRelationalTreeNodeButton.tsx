/**
 * Owned concern: readable card content and accessible semantic input roles.
 * @baseline ADR-0064: the shared presentation mapper owns the canonical type label.
 * @decision Render secondary text only when the mapper supplies a meaningful detail.
 * @consequence Stale JOIN codes cannot imply another type or leave an empty card row.
 * @version 1.0.0
 */
import { useContext, useId, type ContextType, type KeyboardEvent } from 'react';
import { CanvasJoinTypeIconMenu } from './CanvasJoinTypeIconMenu';
import { CanvasJoinTypeChangeContext } from './CanvasJoinTypeChangeContext';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { resolveCanvasRelationalNodeCopy } from './canvasRelationalNodePresentation';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasRelationalTreePlacedNode } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import styles from './CanvasRelationalTreeCard.module.css';

type RelationalNodeButtonProps = Readonly<{
  placed: CanvasRelationalTreePlacedNode;
  selected: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  detailed: boolean;
  movable: boolean;
  pending?: boolean;
  missingInput?: boolean;
  hideDetail?: boolean;
  stagedOperation?: CanvasStagedOperation;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  onDelete?: () => void;
}>;
type RelationalNodeView = ReturnType<typeof resolveCanvasRelationalNodeCopy>;

function relationalInputRole(
  placed: CanvasRelationalTreePlacedNode,
  copy: CanvasRelationalTreeWorkbenchCopy
): string | null {
  return placed.role == null
    ? null
    : {
        left: copy.inspectorDvtRelationalLeftInput,
        right: copy.inspectorDvtRelationalRightInput,
        primary: copy.relationalTreePrimaryInputLabel,
        secondary: copy.relationalTreeSecondaryInputTemplate.replace(
          '{ordinal}',
          String(placed.ordinal + 1)
        ),
        input: copy.inspectorDbtOriginLabel,
      }[placed.role];
}

function editableRelationalJoin(
  node: CanvasRelationalTreePlacedNode['node'],
  view: RelationalNodeView,
  {
    authority,
    pending,
    stagedOperation,
  }: Readonly<{
    authority: ContextType<typeof CanvasJoinTypeChangeContext>;
    pending: boolean;
    stagedOperation: CanvasStagedOperation | undefined;
  }>
): boolean {
  return (
    authority != null &&
    !pending &&
    node.relationId != null &&
    node.operator === 'join' &&
    view.presentation.category === 'join' &&
    (stagedOperation == null || stagedOperation.semanticDocument != null)
  );
}

function deleteRelationalCard(
  event: KeyboardEvent<HTMLButtonElement>,
  onDelete?: () => void
): void {
  if (event.key !== 'Delete' && event.key !== 'Backspace') return;
  if (onDelete == null) return;
  event.preventDefault();
  event.stopPropagation();
  onDelete();
}

function visibleRelationalDetail(
  view: RelationalNodeView,
  { pending, hideDetail }: Pick<RelationalNodeButtonProps, 'pending' | 'hideDetail'>
): string | undefined {
  return pending || hideDetail || view.detail.length === 0 ? undefined : view.detail;
}

function RelationalNodeContent({
  view,
  editableJoin,
  pending,
  pendingLabel,
  detail,
  detailId,
  roleLabel,
}: Readonly<{
  view: RelationalNodeView;
  editableJoin: boolean;
  pending: boolean;
  pendingLabel: string;
  detail: string | undefined;
  detailId: string;
  roleLabel: string | null;
}>): JSX.Element {
  const Icon = view.presentation.icon;
  return (
    <>
      <span className={styles.identity}>
        {editableJoin ? null : <Icon aria-hidden="true" className={styles.icon} />}
        <span data-slot="canvas-relational-node-title" title={view.title} className={styles.title}>
          {view.title}
        </span>
      </span>
      {pending ? (
        <span className={styles.pending}>{pendingLabel}</span>
      ) : detail == null ? null : (
        <span
          id={detailId}
          title={detail}
          data-slot={view.operation === 'read' ? 'canvas-relational-source-detail' : undefined}
          className={styles.detail}
        >
          {detail}
        </span>
      )}
      {roleLabel == null ? null : <span className="sr-only">{roleLabel}</span>}
    </>
  );
}

export function CanvasRelationalTreeNodeButton({
  placed,
  selected,
  copy,
  detailed,
  movable,
  pending = false,
  missingInput = false,
  hideDetail = false,
  stagedOperation,
  onSelect,
  onExpand,
  onDelete,
}: RelationalNodeButtonProps): JSX.Element {
  const { node } = placed;
  const detailId = useId();
  const language = useApplicationLanguageStore((state) => state.language);
  const pendingLabel = missingInput
    ? resolveCanvasSemanticEditorCopy(language).cardRemoval.missingInput
    : copy.relationalTreePendingLabel;
  const roleLabel = relationalInputRole(placed, copy);
  const view = resolveCanvasRelationalNodeCopy(node, copy);
  const { operation, presentation, title } = view;
  const detail = visibleRelationalDetail(view, { pending, hideDetail });
  const authority = useContext(CanvasJoinTypeChangeContext);
  const editableJoin = editableRelationalJoin(node, view, { authority, pending, stagedOperation });
  const button = (
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
      aria-describedby={detail == null ? undefined : detailId}
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
      onKeyDown={(event) => deleteRelationalCard(event, onDelete)}
      className={styles.nodeButton}
    >
      <RelationalNodeContent
        view={view}
        editableJoin={editableJoin}
        pending={pending}
        pendingLabel={pendingLabel}
        detail={detail}
        detailId={detailId}
        roleLabel={roleLabel}
      />
    </button>
  );
  if (!editableJoin || authority == null) return button;
  return (
    <div className={styles.joinHeader} data-detailed={detailed}>
      {button}
      <CanvasJoinTypeIconMenu
        title={title}
        copy={copy}
        relationId={node.relationId!}
        authority={authority}
        staged={stagedOperation}
      />
    </div>
  );
}
