/** Owned concern: resolve retired Canvas route paths into one-shot canonical route intent. */

export const CANVAS_ROUTE_INTENT_SEARCH_PARAM = 'canvasIntent';

export type CanvasUnavailableLegacySurfaceId = 'diff' | 'artifacts' | 'unknown';

type CanvasRouteIntentToken =
  | 'project-code'
  | 'column-lineage'
  | 'unavailable-diff'
  | 'unavailable-artifacts'
  | 'unavailable-legacy-surface';

export type CanvasRouteIntent =
  | Readonly<{ kind: 'open-contextual-workbench'; workbenchId: 'project-code' }>
  | Readonly<{ kind: 'enable-lens'; lensId: 'column-lineage' }>
  | Readonly<{
      kind: 'unavailable-legacy-surface';
      surfaceId: CanvasUnavailableLegacySurfaceId;
    }>;

const LEGACY_ROUTE_INTENT_BY_PATH: Readonly<Record<string, CanvasRouteIntentToken>> = {
  code: 'project-code',
  lineage: 'column-lineage',
  diff: 'unavailable-diff',
  artifacts: 'unavailable-artifacts',
};

const ROUTE_INTENT_BY_TOKEN: Readonly<Record<CanvasRouteIntentToken, CanvasRouteIntent>> = {
  'project-code': { kind: 'open-contextual-workbench', workbenchId: 'project-code' },
  'column-lineage': { kind: 'enable-lens', lensId: 'column-lineage' },
  'unavailable-diff': { kind: 'unavailable-legacy-surface', surfaceId: 'diff' },
  'unavailable-artifacts': {
    kind: 'unavailable-legacy-surface',
    surfaceId: 'artifacts',
  },
  'unavailable-legacy-surface': {
    kind: 'unavailable-legacy-surface',
    surfaceId: 'unknown',
  },
};

export function resolveLegacyCanvasRouteIntent({
  legacyPath,
  search,
}: Readonly<{
  legacyPath: string | undefined;
  search: string;
}>): string {
  const normalizedLegacyPath = legacyPath?.replace(/^\/+|\/+$/g, '').toLowerCase() ?? '';
  const intentToken =
    LEGACY_ROUTE_INTENT_BY_PATH[normalizedLegacyPath] ?? 'unavailable-legacy-surface';
  const searchParams = new URLSearchParams(search);
  searchParams.set(CANVAS_ROUTE_INTENT_SEARCH_PARAM, intentToken);

  return `/canvas?${searchParams.toString()}`;
}

export function resolveCanvasRouteIntent(searchParams: URLSearchParams): CanvasRouteIntent | null {
  const token = searchParams.get(CANVAS_ROUTE_INTENT_SEARCH_PARAM);
  if (token == null || !(token in ROUTE_INTENT_BY_TOKEN)) {
    return null;
  }

  return ROUTE_INTENT_BY_TOKEN[token as CanvasRouteIntentToken];
}

export function removeCanvasRouteIntent(searchParams: URLSearchParams): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.delete(CANVAS_ROUTE_INTENT_SEARCH_PARAM);
  return nextSearchParams;
}
