import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { vi } from 'vitest';
import { ConnectedSourceRefSchema, TransformSqlProjectionResponseSchema } from '@dvt/contracts';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';

import { SOURCE, EDGE, buildCanonicalTransform } from './canvasOutputProjection.test-support';

describe('Canonical output projection', () => {
  it('reads SQL through the authorized projection query using only the selected canonical identity', async () => {
    // External dbt producers require server-authorized SQL; local projection omitted that authority.
    const transform = buildCanonicalTransform();
    const semanticPlanSha256 =
      readDvtTransformAuthoringAuthority(transform)!.semanticDocument.semanticPlan.sha256;
    const projectTransformSql = vi.fn(async () =>
      TransformSqlProjectionResponseSchema.parse({
        schemaVersion: 'canvas-transform-sql-projection.v1' as const,
        canvasId: 'canvas-one',
        transformNodeId: transform.id,
        draftRevision: 'revision-one',
        semanticPlanSha256,
        sql: 'select authorized_output',
        provenance: {
          sourceRefs: [ConnectedSourceRefSchema.parse(SOURCE.metadata!.connectedSourceRef)],
        },
      })
    );
    const input = {
      transformNode: transform,
      nodes: [SOURCE, transform],
      edges: [EDGE],
      codeProjection: { canvasId: 'canvas-one', query: { projectTransformSql } },
    };
    const sql = await projectDvtSubstraitTransformOutputToPostgresSql(input);
    expect(projectTransformSql).toHaveBeenCalledExactlyOnceWith({
      canvasId: 'canvas-one',
      transformNodeId: transform.id,
      semanticPlanSha256,
    });
    expect(sql).toBe('select authorized_output');
  });
});
