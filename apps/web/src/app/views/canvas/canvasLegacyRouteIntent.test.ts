import { describe, expect, it } from 'vitest';

import {
  CANVAS_ROUTE_INTENT_SEARCH_PARAM,
  resolveCanvasRouteIntent,
  resolveLegacyCanvasRouteIntent,
} from './canvasLegacyRouteIntent';

describe('resolveLegacyCanvasRouteIntent', () => {
  it.each([
    ['code', 'project-code'],
    ['lineage', 'column-lineage'],
    ['diff', 'unavailable-diff'],
    ['artifacts', 'unavailable-artifacts'],
  ] as const)('maps the retired %s route to the %s Canvas intent', (legacyPath, expectedIntent) => {
    const destination = resolveLegacyCanvasRouteIntent({
      legacyPath,
      search: '?authority=dbt-project-files&canvasId=orders&projectRoot=projects%2Forders',
    });
    const url = new URL(destination, 'https://dvt.local');

    expect(url.pathname).toBe('/canvas');
    expect(url.searchParams.get('authority')).toBe('dbt-project-files');
    expect(url.searchParams.get('canvasId')).toBe('orders');
    expect(url.searchParams.get('projectRoot')).toBe('projects/orders');
    expect(url.searchParams.get(CANVAS_ROUTE_INTENT_SEARCH_PARAM)).toBe(expectedIntent);
  });

  it('marks unknown nested routes as unsupported without reflecting their path into the URL', () => {
    const destination = resolveLegacyCanvasRouteIntent({
      legacyPath: 'unknown/private-value',
      search: '?canvasId=orders',
    });
    const url = new URL(destination, 'https://dvt.local');

    expect(url.searchParams.get(CANVAS_ROUTE_INTENT_SEARCH_PARAM)).toBe(
      'unavailable-legacy-surface'
    );
    expect(destination).not.toContain('private-value');
  });
});

describe('resolveCanvasRouteIntent', () => {
  it.each([
    ['project-code', { kind: 'open-contextual-workbench', workbenchId: 'project-code' }],
    ['column-lineage', { kind: 'enable-lens', lensId: 'column-lineage' }],
    ['unavailable-diff', { kind: 'unavailable-legacy-surface', surfaceId: 'diff' }],
    ['unavailable-artifacts', { kind: 'unavailable-legacy-surface', surfaceId: 'artifacts' }],
    ['unavailable-legacy-surface', { kind: 'unavailable-legacy-surface', surfaceId: 'unknown' }],
  ] as const)('resolves the %s one-shot intent', (value, expected) => {
    expect(resolveCanvasRouteIntent(new URLSearchParams({ canvasIntent: value }))).toEqual(
      expected
    );
  });

  it('ignores absent and unrecognized intent values', () => {
    expect(resolveCanvasRouteIntent(new URLSearchParams())).toBeNull();
    expect(
      resolveCanvasRouteIntent(new URLSearchParams({ canvasIntent: 'arbitrary-value' }))
    ).toBeNull();
  });
});
