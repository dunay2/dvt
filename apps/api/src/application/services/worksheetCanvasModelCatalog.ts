/** Admit one exact typed relation from an actual bounded catalog response, without IO. */
import {
  buildRelationalSourceObjectId,
  type RelationalSourceObjectLocator,
  type SourceObject,
  type SourceObjectCatalogResponse,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { z } from 'zod';

import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';

import type { WorksheetSqlRelation } from './worksheetCanvasModelSql.js';

export type WorksheetCatalogRelation = SourceObject & { locator: RelationalSourceObjectLocator };

function matchesCatalogRelation(
  candidate: SourceObject,
  relation: WorksheetSqlRelation,
  database: string
): boolean {
  if (candidate.locator.kind !== 'relation') return false;
  if (relation.schema != null && relation.schema !== candidate.locator.schema) return false;
  return (
    jcsCanonicalize([candidate.locator.catalog, candidate.locator.name]) ===
    jcsCanonicalize([database, relation.name])
  );
}

function requireTypedRelation(match: SourceObject): WorksheetCatalogRelation {
  if (match.locator.kind !== 'relation')
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  if (match.objectId !== buildRelationalSourceObjectId(match.locator))
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  const columns = z
    .array(z.object({ type: z.string().min(1), nullable: z.boolean() }).passthrough())
    .min(1);
  if (!columns.safeParse(match.columns).success)
    throw new CanvasModelSqlUnavailableError('unknown_type');
  return { ...match, locator: match.locator };
}

function currentWorksheetCatalogObjects(page: SourceObjectCatalogResponse) {
  if (page.kind !== 'object-page') throw new CanvasModelSqlUnavailableError('input_unavailable');
  if (page.truncated) throw new CanvasModelSqlUnavailableError('input_unavailable');
  return page.objects;
}

function uniqueWorksheetCatalogRelation(matches: SourceObject[]) {
  if (matches.length === 0) throw new CanvasModelSqlUnavailableError('unknown_input');
  if (matches.length > 1) throw new CanvasModelSqlUnavailableError('ambiguous_reference');
  return requireTypedRelation(matches[0]!);
}

export function admitWorksheetCatalogRelation(
  page: SourceObjectCatalogResponse,
  relation: WorksheetSqlRelation,
  database: string
): WorksheetCatalogRelation {
  const objects = currentWorksheetCatalogObjects(page);
  const matches = objects.filter((candidate) =>
    matchesCatalogRelation(candidate, relation, database)
  );
  return uniqueWorksheetCatalogRelation(matches);
}
