import { describe, expect, it } from 'vitest';
import type { CoreNodeRole } from '../../types/canonical';
import { guardTransformationAuthoringNode } from './transformationAuthoringGuard';

function evaluate(existingRoles: CoreNodeRole[], nextRole: CoreNodeRole) {
  return guardTransformationAuthoringNode({ existingRoles, nextRole });
}

describe('guardTransformationAuthoringNode', () => {
  it('allows first input/transform/output node on empty canvas', () => {
    expect(evaluate([], 'input')).toEqual({ allowed: true });
    expect(evaluate([], 'transform')).toEqual({ allowed: true });
    expect(evaluate([], 'output')).toEqual({ allowed: true });
  });

  it('rejects unsupported roles in transformation context', () => {
    expect(evaluate(['input'], 'check')).toEqual({
      allowed: false,
      reason: 'Transformation draft supports only input, transform, and output nodes.',
    });
  });

  it('rejects duplicate role in transformation context', () => {
    expect(evaluate(['input'], 'input')).toEqual({
      allowed: false,
      reason: 'Transformation draft allows exactly one node per role (input, transform, output).',
    });
  });

  it('rejects adding a fourth node in constrained transformation graph', () => {
    expect(evaluate(['input', 'transform', 'output'], 'input')).toEqual({
      allowed: false,
      reason: 'Transformation draft allows exactly 3 nodes: source, sql_transform, and sink.',
    });
  });

  it('does not apply transformation restrictions for mixed-role legacy canvas', () => {
    expect(evaluate(['check'], 'control')).toEqual({ allowed: true });
  });
});
