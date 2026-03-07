import type { CompiledCodeRef } from '@dvt/contracts';

export interface SqlJobFacet {
  sql: {
    query: string;
  };
}

export interface DvtDbtDetailsFacet {
  compiledCodeRef: CompiledCodeRef;
}

export interface LineageJobFacets {
  sql?: SqlJobFacet;
  dvt_dbt_details?: DvtDbtDetailsFacet;
}

// CompiledCodeBlob moved to @dvt/contracts (G-6: canonical types must live in shared kernel).
// Re-export for local consumers still importing from this path.
export type { CompiledCodeBlob } from '@dvt/contracts';

export interface LineageWarning {
  code: 'COMPILED_CODE_RESOLUTION_FAILED';
  message: string;
}
