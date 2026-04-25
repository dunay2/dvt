import { describe, expect, it } from 'vitest';
import type { CoreNodeRole } from '../../types/canonical';
import { guardTransformationAuthoringNode } from './transformationAuthoringGuard';

function evaluate(
  existingRoles: CoreNodeRole[],
  nextRole: CoreNodeRole,
  enforceTransformationTopology: boolean
): ReturnType<typeof guardTransformationAuthoringNode> {
  return guardTransformationAuthoringNode({
    enforceTransformationTopology,
    existingRoles,
    nextRole,
  });
}

describe('guardTransformationAuthoringNode', () => {
  it('does not restrict generic canvas authoring when transformation mode is disabled', () => {
    expect(evaluate([], 'check', false)).toEqual({ allowed: true });
    expect(evaluate(['input', 'transform', 'output'], 'control', false)).toEqual({
      allowed: true,
    });
  });

  it('keeps canvas authoring unrestricted when transformation mode is enabled', () => {
    expect(evaluate([], 'input', true)).toEqual({ allowed: true });
    expect(evaluate([], 'transform', true)).toEqual({ allowed: true });
    expect(evaluate([], 'output', true)).toEqual({ allowed: true });
    expect(evaluate([], 'check', true)).toEqual({ allowed: true });
    expect(evaluate([], 'control', true)).toEqual({ allowed: true });
    expect(evaluate(['input'], 'input', true)).toEqual({ allowed: true });
    expect(evaluate(['input', 'transform', 'output'], 'check', true)).toEqual({ allowed: true });
  });
});
