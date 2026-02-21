export type AdrStatus = 'Accepted' | 'Proposed' | 'Deprecated' | 'Superseded';

export type GovernedKind = 'code' | 'schema' | 'doc' | 'test';

export type AdrRef = {
  number: string; // "ADR-0010"
  title?: string;
  status?: AdrStatus;
  sourcePath?: string;
  updated?: string; // YYYY-MM-DD
};

export type HeaderTrace = {
  filePath: string;
  kind: GovernedKind;
  baselines: AdrRef[]; // parsed ADR numbers; enriched via catalog
  decisions: string[]; // e.g. "Section 3.3"
  consequence?: string;
  version?: string; // semver
  date?: string; // YYYY-MM-DD
  baselineRaw?: string;
};

export type ValidationIssueCode =
  | 'MISSING_BASELINE'
  | 'ADR_NOT_FOUND'
  | 'ADR_NOT_ACCEPTED'
  | 'MISSING_DECISION'
  | 'MISSING_VERSION'
  | 'INVALID_FORMAT'
  | 'REVERSE_COVERAGE_FAIL';

export type ValidationIssue = {
  code: ValidationIssueCode;
  severity: 'error' | 'warn';
  filePath?: string;
  adrNumber?: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

export type TraceabilityManifest = {
  component: string;
  version: string;
  generated: string; // YYYY-MM-DD
  repo?: { sha: string; url?: string; branch?: string };
  baseline_adrs: Array<{
    number: string;
    title?: string;
    decisions: string[];
    implemented_by: string[];
  }>;
};
