import { isRelationalSourceObject } from '@dvt/contracts';

import type { SelectableSourceObject } from './types';

export function resolveSourceImportSharedCatalog(
  sourceObjects: readonly SelectableSourceObject[]
): string | null {
  const catalogs = new Set(
    sourceObjects
      .filter(isRelationalSourceObject)
      .map((sourceObject) => sourceObject.locator.catalog)
  );
  return sourceObjects.length > 0 &&
    sourceObjects.every(isRelationalSourceObject) &&
    catalogs.size === 1
    ? ([...catalogs][0] ?? null)
    : null;
}

export function resolveSourceImportContextualName(
  sourceObject: SelectableSourceObject,
  sharedCatalog: string | null
): string {
  if (!isRelationalSourceObject(sourceObject)) {
    return sourceObject.displayName;
  }
  const prefix =
    sharedCatalog === sourceObject.locator.catalog ? [] : [sourceObject.locator.catalog];
  return [...prefix, sourceObject.locator.schema, sourceObject.locator.name].join('.');
}
