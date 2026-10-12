/** Present one card's already projected semantic detail. */
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import styles from './CanvasRelationalTreeCard.module.css';

export function CanvasRelationalTreeCardDetail({
  id,
  relationId,
  label,
  graph,
  stagedOperation,
}: Readonly<{
  id: string;
  relationId?: string;
  label: string;
  graph: SemanticWorkbenchGraph;
  stagedOperation?: CanvasStagedOperation;
}>): JSX.Element {
  const stagedFieldScope =
    stagedOperation?.semanticDocument == null
      ? undefined
      : {
          rootId: stagedOperation.id,
          producerPlanSha256: stagedOperation.semanticDocument.semanticPlan.sha256,
        };
  return (
    <div
      id={id}
      data-slot="canvas-relational-card-detail"
      data-relation-id={relationId}
      tabIndex={0}
      aria-label={label}
      className={styles.semanticDetail}
    >
      <CanvasRelationalScalarTree graph={graph} compact stagedFieldScope={stagedFieldScope} />
    </div>
  );
}
