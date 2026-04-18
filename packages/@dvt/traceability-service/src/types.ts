/**
 * @file packages/@dvt/traceability-service/src/types.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.3 — Canonical machine-readable types for traceability metadata and validation
 * @decision Section 4.5 — Stable graph-oriented identifiers for ADR/File relationships
 * @consequence Typed governance payloads remain deterministic across scanner, validator, manifest and publisher
 * @version 0.1.0
 * @date 2026-02-21
 */
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
  | 'NON_TEST_MISSING_DECISION'
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

export type ValidationIssueBaselineEntry = {
  code: ValidationIssueCode;
  filePath?: string;
  adrNumber?: string;
};

export type ValidationIssueBaselineFile = {
  version: string;
  issues: ValidationIssueBaselineEntry[];
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
