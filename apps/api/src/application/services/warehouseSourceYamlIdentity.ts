/** Owned concern: resolve stable dbt source YAML identities. */

import { jcsCanonicalize } from '@dvt/crypto';

import {
  toCollisionResistantYamlIdentifierPart,
  toStableYamlIdentifierPart,
} from './warehouseSourceYamlDescriptor.js';
import type { ConnectedRelationalSourceObject } from './warehouseSourceYamlTypes.js';

export function sourceObjectIdentity(sourceObject: ConnectedRelationalSourceObject): string {
  return jcsCanonicalize({
    connectionId: sourceObject.connectionId,
    sourceObjectId: sourceObject.objectId,
  });
}

export function buildCanonicalSourceName(sourceObject: ConnectedRelationalSourceObject): string {
  return [
    toStableYamlIdentifierPart(sourceObject.connectionId),
    toStableYamlIdentifierPart(sourceObject.locator.catalog),
    toStableYamlIdentifierPart(sourceObject.locator.schema),
  ].join('_');
}

export function buildCanonicalTableName(sourceObject: ConnectedRelationalSourceObject): string {
  return toStableYamlIdentifierPart(sourceObject.locator.name);
}

export function buildCollisionResistantSourceName(
  sourceObject: ConnectedRelationalSourceObject
): string {
  return [
    toCollisionResistantYamlIdentifierPart(sourceObject.connectionId),
    toCollisionResistantYamlIdentifierPart(sourceObject.locator.catalog),
    toCollisionResistantYamlIdentifierPart(sourceObject.locator.schema),
  ].join('_');
}

export function buildCollisionResistantTableName(
  sourceObject: ConnectedRelationalSourceObject
): string {
  return toCollisionResistantYamlIdentifierPart(sourceObject.locator.name);
}
