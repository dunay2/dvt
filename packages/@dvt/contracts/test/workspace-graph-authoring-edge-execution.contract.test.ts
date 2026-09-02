import { describe, expect, it } from 'vitest';

import {
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  readWorkspaceGraphAuthoringEdgeExecutionGate,
  withWorkspaceGraphAuthoringEdgeExecutionGate,
} from '../src/index.js';

describe('WorkspaceGraphAuthoringEdge execution policy', () => {
  it.each([
    [{}, 'open', true],
    [{ executionGate: 'closed' }, 'closed', false],
    [{ executionGate: 'future-state' }, 'invalid', false],
    [{ executionDependency: false }, 'open', false],
    [{ executionDependency: false, executionGate: 'closed' }, 'closed', false],
  ] as const)(
    'projects metadata %o as %s with effective execution %s',
    (metadata, gate, effective) => {
      const edge = { metadata };

      expect(readWorkspaceGraphAuthoringEdgeExecutionGate(edge)).toBe(gate);
      expect(isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)).toBe(effective);
    }
  );

  it('closes and reopens only the user gate while preserving structural metadata', () => {
    const closed = withWorkspaceGraphAuthoringEdgeExecutionGate(
      { executionDependency: false, owner: 'finance' },
      'closed'
    );

    expect(closed).toEqual({
      executionDependency: false,
      executionGate: 'closed',
      owner: 'finance',
    });
    expect(withWorkspaceGraphAuthoringEdgeExecutionGate(closed, 'open')).toEqual({
      executionDependency: false,
      owner: 'finance',
    });
  });

  it('does not retain an empty metadata object after reopening', () => {
    expect(withWorkspaceGraphAuthoringEdgeExecutionGate({ executionGate: 'closed' }, 'open')).toBe(
      undefined
    );
  });
});
