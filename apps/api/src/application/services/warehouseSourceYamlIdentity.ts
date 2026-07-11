/** Owned concern: resolve stable dbt source YAML identities. */

import {
  toCollisionResistantYamlIdentifierPart,
  toStableYamlIdentifierPart,
} from './warehouseSourceYamlDescriptor.js';
import type { ConnectedRelationalSourceObject } from './warehouseSourceYamlTypes.js';

export function sourceObjectIdentity(sourceObject: ConnectedRelationalSourceObject): string {
  return sourceObject.objectId;
}

export function buildCanonicalSourceName(sourceObject: ConnectedRelationalSourceObject): string {
  return [
    toStableYamlIdentifierPart(sourceObject.connectionId),
    toCollisionResistantYamlIdentifierPart(sourceObject.locator.catalog),
    toCollisionResistantYamlIdentifierPart(sourceObject.locator.schema),
  ].join('_');
}

export function buildCanonicalTableName(sourceObject: ConnectedRelationalSourceObject): string {
  return toCollisionResistantYamlIdentifierPart(sourceObject.locator.name);
}
