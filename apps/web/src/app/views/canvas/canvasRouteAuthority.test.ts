import { describe, expect, it } from 'vitest';

import { resolveCanvasRouteAuthority } from './canvasRouteAuthority';

describe('resolveCanvasRouteAuthority', () => {
  it('keeps the existing Canvas route on graph-draft authority when no authority is requested', () => {
    expect(resolveCanvasRouteAuthority(new URLSearchParams())).toEqual({ kind: 'graph-draft' });
  });

  it('resolves one explicit file-backed authority binding', () => {
    const params = new URLSearchParams({
      authority: 'dbt-project-files',
      canvasId: 'analytics-canvas',
      projectRoot: 'analytics/dbt',
    });

    expect(resolveCanvasRouteAuthority(params)).toEqual({
      kind: 'dbt-project-files',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'analytics-canvas',
        authority: {
          kind: 'dbt-project-files',
          projectRoot: 'analytics/dbt',
        },
      },
    });
  });

  it.each([
    ['unknown authority', { authority: 'manifest' }],
    ['missing canvas identity', { authority: 'dbt-project-files', projectRoot: '.' }],
    ['missing project root', { authority: 'dbt-project-files', canvasId: 'analytics' }],
    [
      'project traversal',
      { authority: 'dbt-project-files', canvasId: 'analytics', projectRoot: '../outside' },
    ],
    ['orphan project root', { projectRoot: 'analytics/dbt' }],
  ])('fails closed for %s instead of falling back to graph draft', (_label, values) => {
    const result = resolveCanvasRouteAuthority(new URLSearchParams(values));

    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.message).toMatch(/authority/i);
    }
  });
});
