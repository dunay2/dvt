import { describe, expect, it } from 'vitest';
import type { CoreNodeRole } from '../../types/canonical';
import { guardTransformationAuthoringNode } from './transformationAuthoringGuard';

function evaluate(
  existingRoles: CoreNodeRole[],
  nextRole: CoreNodeRole,
  authoringModeEnabled: boolean
): ReturnType<typeof guardTransformationAuthoringNode> {
  return guardTransformationAuthoringNode({
    authoringModeEnabled,
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

  it('allows first supported node when transformation mode is enabled', () => {
    expect(evaluate([], 'input', true)).toEqual({ allowed: true });
    expect(evaluate([], 'transform', true)).toEqual({ allowed: true });
    expect(evaluate([], 'output', true)).toEqual({ allowed: true });
  });

  it('rejects unsupported roles when transformation mode is enabled', () => {
    expect(evaluate([], 'check', true)).toEqual({
      allowed: false,
      reason: 'Transformation draft supports only input, transform, and output nodes.',
    });
  });

  it('rejects duplicate role when transformation mode is enabled', () => {
    expect(evaluate(['input'], 'input', true)).toEqual({
      allowed: false,
      reason: 'Transformation draft allows exactly one node per role (input, transform, output).',
    });
  });

  it('rejects adding a fourth node in constrained transformation graph', () => {
    expect(evaluate(['input', 'transform', 'output'], 'input', true)).toEqual({
      allowed: false,
      reason: 'Transformation draft allows exactly 3 nodes: source, sql_transform, and sink.',
    });
  });
});
