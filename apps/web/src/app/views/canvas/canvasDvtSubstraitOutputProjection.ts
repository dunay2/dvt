/** Read a target's server-authorized SQL for the exact canonical document identity. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  TransformSqlProjectionRequestSchema,
  type TransformSqlProjectionResponse,
} from '@dvt/contracts';
import type { CanvasTransformSqlQueryBinding } from '../../ports/canvasTransformSql';
import { CanvasTransformSqlQueryError } from '../../ports/canvasTransformSql';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export type DvtSubstraitTransformOutputProjectionArgs = Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  codeProjection?: CanvasTransformSqlQueryBinding;
  relationId?: string;
  presentation?: 'readable';
}>;

export async function projectDvtSubstraitTransformOutputToPostgresSql(
  args: DvtSubstraitTransformOutputProjectionArgs
): Promise<Pick<TransformSqlProjectionResponse, 'sql' | 'presentation'>> {
  const binding = args.codeProjection;
  const authority = readDvtTransformAuthoringAuthority(args.transformNode);
  if (binding == null || authority == null) throw new CanvasTransformSqlQueryError();
  const request = TransformSqlProjectionRequestSchema.parse({
    canvasId: binding.canvasId,
    transformNodeId: args.transformNode.id,
    semanticPlanSha256: authority.semanticDocument.semanticPlan.sha256,
    ...(args.relationId === undefined ? {} : { relationId: args.relationId }),
    ...(args.presentation === undefined ? {} : { presentation: args.presentation }),
  });
  const projection = await binding.query.projectTransformSql(request);
  return projection;
}
