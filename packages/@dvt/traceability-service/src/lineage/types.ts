import type { LineageFacetMetadata } from './openlineageSchema.js';
import { OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL } from './openlineageSchema.js';

export interface SqlJobFacet extends LineageFacetMetadata<
  typeof OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL
> {
  query: string;
}

export interface LineageJobFacets {
  sql?: SqlJobFacet;
}

export type { LineageWarning } from './warningContract.js';
