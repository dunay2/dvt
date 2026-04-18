/**
 * @file packages/@dvt/traceability-service/src/contracts.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.3 - Define explicit contracts for scanner, validator and manifest generation
 * @decision Section 4.4 - Service interfaces enforce machine-checkable governance boundaries
 * @consequence Traceability pipeline remains composable and testable through stable interfaces
 * @version 0.1.0
 * @date 2026-02-21
 */
import type {
  AdrRef,
  AdrStatus,
  HeaderTrace,
  TraceabilityManifest,
  ValidationIssueBaselineEntry,
  ValidationResult,
} from './types.js';

export interface IAdrCatalog {
  getAdr(number: string): Promise<AdrRef | null>;
  listAdrs(status?: AdrStatus): Promise<AdrRef[]>;
}

export interface ITraceHeaderScanner {
  scan(input: {
    repoRoot: string;
    includeGlobs: string[];
    excludeGlobs: string[];
  }): Promise<HeaderTrace[]>;
}

export interface ITraceValidator {
  validate(input: {
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
    requireDecision?: boolean;
    failOnMissingVersion?: boolean;
  }): Promise<ValidationResult>;
  validateReverseCoverage(input: {
    traces: HeaderTrace[];
    acceptedAdrs: AdrRef[];
  }): Promise<ValidationResult>;
}

export interface IManifestBuilder {
  build(input: {
    component: string;
    version: string;
    repoSha: string;
    generated: string;
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
  }): Promise<TraceabilityManifest>;
}

export interface ITraceabilityService {
  validateAndBuildManifest(input: {
    repoRoot: string;
    component: string;
    componentVersion: string;
    repoSha: string;
    includeGlobs: string[];
    excludeGlobs: string[];
    generated: string;
    requireDecision?: boolean;
    failOnMissingVersion?: boolean;
    issueBaseline?: ValidationIssueBaselineEntry[];
  }): Promise<{ validation: ValidationResult; manifest?: TraceabilityManifest }>;
}
