/**
 * Owned concern: compose the applied read-only tree and its explicit editing entry.
 * @baseline ADR-0044: recovery copy is presentation, not semantic authority.
 * @decision Keep appearance in a CSS Module and preserve the semantic workspace class.
 * @consequence Styling can change without altering retained inspection or editing admission.
 * @version 1.0.0
 */
import type { ComponentProps } from 'react';
import styles from './CanvasRelationalTreeInspection.module.css';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import { CanvasRelationalTreeSideInspector } from './CanvasRelationalTreeSideInspector';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';

export function CanvasRelationalTreeInspection(
  props: ComponentProps<typeof CanvasRelationalTreeSideInspector>
): JSX.Element | null {
  const { model, transformNode, copy, onExpandedChange, modelOutput } = props;
  if (model.projection == null) return null;
  return (
    <div data-slot="canvas-relational-tree-inspection" className={styles.inspection}>
      {model.unavailableMessage != null && (
        <p
          role="status"
          data-slot="canvas-producer-input-recovery"
          className={styles.recoveryNotice}
        >
          {model.unavailableMessage}
        </p>
      )}
      <CanvasRelationalTreeOperationShelf
        copy={copy}
        editable={model.authoringAvailable}
        onStageOperation={model.session.staged.stage}
      />
      <div className={`canvas-operation-workspace ${styles.workspace}`}>
        <CanvasRelationalTreeView
          sourceOutputFieldsByRelationId={model.sourceOutputFieldsByRelationId}
          transformNode={transformNode}
          outputName={transformNode.name}
          root={model.projection.root}
          selectedLocator={model.selectedLocator}
          copy={copy}
          onSelect={model.selectTreeNode}
          onDropSource={model.authoringAvailable ? model.session.occurrences.drop : undefined}
          onDropOperation={model.authoringAvailable ? model.session.staged.stage : undefined}
          onRemove={model.authoringAvailable ? model.session.removal.remove : undefined}
          onDisconnectOutput={
            model.authoringAvailable ? model.session.output.disconnect : undefined
          }
          onExpand={(locator) => {
            modelOutput.setOpen(false);
            model.selectTreeNode(locator);
            onExpandedChange(true);
          }}
          onOpenOutput={() => {
            onExpandedChange(false);
            modelOutput.setOpen(true);
          }}
        />
        <CanvasRelationalTreeSideInspector {...props} />
      </div>
    </div>
  );
}
