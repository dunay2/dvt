/** Owned concern: bind one visual DVT transform and its source to the pure PostgreSQL compiler. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { requireSourcePayload } from './previewGraphNodePayloads';
import { compileVisualTransformRecipeToPostgresSql } from './canvasVisualTransformSqlCompiler';

export function compileDvtVisualTransformNodeToPostgresSql({
  transformNode,
  sourceNode,
}: Readonly<{
  transformNode: CanonicalNode;
  sourceNode: CanonicalNode;
}>): string {
  const authority = readDvtTransformAuthoringAuthority(transformNode);
  if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.visual) {
    throw new Error('Visual SQL compilation requires visual transform authority.');
  }
  const source = requireSourcePayload(sourceNode);

  return compileVisualTransformRecipeToPostgresSql({
    recipe: authority.recipe,
    sourceBinding: {
      nodeId: sourceNode.id,
      schema: source.payload.schema,
      table: source.payload.table,
      alias: source.payload.alias,
    },
  });
}
