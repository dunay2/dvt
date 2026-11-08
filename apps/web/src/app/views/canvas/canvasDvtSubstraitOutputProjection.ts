/** Read a target's server-authorized SQL for the exact canonical document identity. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { TransformSqlProjectionRequestSchema } from '@dvt/contracts';
import type { CanvasTransformSqlQueryBinding } from '../../ports/canvasTransformSql';
import { CanvasTransformSqlQueryError } from '../../ports/canvasTransformSql';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export type DvtSubstraitTransformOutputProjectionArgs = Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  codeProjection?: CanvasTransformSqlQueryBinding;
}>;

export async function projectDvtSubstraitTransformOutputToPostgresSql(
  args: DvtSubstraitTransformOutputProjectionArgs
): Promise<string> {
  const binding = args.codeProjection;
  const authority = readDvtTransformAuthoringAuthority(args.transformNode);
  if (binding == null || authority == null) throw new CanvasTransformSqlQueryError();
  const request = TransformSqlProjectionRequestSchema.parse({
    canvasId: binding.canvasId,
    transformNodeId: args.transformNode.id,
    semanticPlanSha256: authority.semanticDocument.semanticPlan.sha256,
  });
  const projection = await binding.query.projectTransformSql(request);
  return projection.sql;
}
