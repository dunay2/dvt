import type { CompiledCodeRef } from '@dvt/contracts';

import type { LineageFacetMetadata } from './openlineageSchema.js';
import {
  DVT_DBT_DETAILS_JOB_FACET_SCHEMA_URL,
  OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL,
} from './openlineageSchema.js';

export interface SqlJobFacet extends LineageFacetMetadata<
  typeof OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL
> {
  query: string;
}

export interface DvtDbtDetailsFacet extends LineageFacetMetadata<
  typeof DVT_DBT_DETAILS_JOB_FACET_SCHEMA_URL
> {
  compiledCodeRef: CompiledCodeRef;
}

export interface LineageJobFacets {
  sql?: SqlJobFacet;
  dvt_dbt_details?: DvtDbtDetailsFacet;
}

// CompiledCodeBlob moved to @dvt/contracts (G-6: canonical types must live in shared kernel).
// Re-export for local consumers still importing from this path.
export type { CompiledCodeBlob } from '@dvt/contracts';
export type { LineageWarning } from './warningContract.js';
