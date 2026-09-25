/** Compose the shared operand query with one presentation policy. */
import { useSelectedRelationInput } from './useSelectedRelationInput';
import {
  projectSelectedRelationTool,
  type selectedUnaryTools,
} from './canvasSelectedRelationTools';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

export function useSelectedRelationTools(
  document: SubstraitDocument | null,
  relationId: string | null
) {
  const input = useSelectedRelationInput(relationId, 'insert');
  const unary = (['filter', 'aggregate', 'window', 'sort', 'fetch'] as const).flatMap(
    (operation) => {
      const tool = projectSelectedRelationTool(input, operation);
      return tool == null ? [] : [tool];
    }
  );
  return {
    targetId: input?.targetId,
    tools: document == null ? [] : unary,
  };
}

export function useSelectedRelationTool(
  relationId: string | null,
  operation: keyof typeof selectedUnaryTools,
  intent: 'insert' | 'edit'
) {
  const input = useSelectedRelationInput(relationId, intent);
  const tool = projectSelectedRelationTool(input, operation);
  return input == null || tool == null ? null : { ...input, tool };
}
