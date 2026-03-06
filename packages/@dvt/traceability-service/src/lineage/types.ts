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

export interface CompiledCodeBlob {
  sourceUri: string;
  sqlText: string;
  sha256: string;
  sizeBytes: number;
  encoding: 'utf-8';
}

export interface LineageWarning {
  code: 'COMPILED_CODE_RESOLUTION_FAILED';
  message: string;
}
