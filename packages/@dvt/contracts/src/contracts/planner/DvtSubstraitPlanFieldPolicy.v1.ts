/** Apply the semantic name and literal budgets to decoded canonical Plan values. */
import type { z } from 'zod';

import {
  DvtSemanticFieldNameV1Schema,
  DvtStringLiteralV1Schema,
} from './CanvasAuthoringFieldPolicy.v1.js';

export function addDvtSubstraitPlanFieldPolicyIssues(
  plan: unknown,
  context: z.RefinementCtx
): void {
  const visited = new Set<object>();
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    const relType = record['relType'];
    if (relType !== null && typeof relType === 'object') {
      const relation = relType as Record<string, unknown>;
      const root = relation['case'] === 'root' ? relation['value'] : undefined;
      if (root !== null && typeof root === 'object') {
        const names = (root as Record<string, unknown>)['names'];
        if (Array.isArray(names)) {
          names.forEach((name, index) => {
            if (!DvtSemanticFieldNameV1Schema.safeParse(name).success) {
              context.addIssue({
                code: 'custom',
                message: 'Substrait root output name violates the semantic field name policy.',
                path: ['semanticPlan', 'bytesBase64', 'rootNames', index],
              });
            }
          });
        }
      }
    }
    const rexType = record['rexType'];
    if (rexType !== null && typeof rexType === 'object') {
      const expression = rexType as Record<string, unknown>;
      const literal = expression['case'] === 'literal' ? expression['value'] : undefined;
      if (literal !== null && typeof literal === 'object') {
        const literalType = (literal as Record<string, unknown>)['literalType'];
        if (literalType !== null && typeof literalType === 'object') {
          const candidate = literalType as Record<string, unknown>;
          if (
            candidate['case'] === 'string' &&
            !DvtStringLiteralV1Schema.safeParse(candidate['value']).success
          ) {
            context.addIssue({
              code: 'custom',
              message: 'Substrait string literal violates the DVT literal policy.',
              path: ['semanticPlan', 'bytesBase64', 'stringLiteral'],
            });
          }
        }
      }
    }
    Object.values(record).forEach(visit);
  };
  visit(plan);
}
