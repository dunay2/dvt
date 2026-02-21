/**
 * @file packages/@dvt/traceability-service/src/core/validator.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.1 — Enforce baseline presence and header completeness in governed artifacts
 * @decision Section 4.4 — Enforce reverse coverage for all Accepted ADRs
 * @consequence CI can fail deterministically on traceability drift or orphaned accepted decisions
 * @version 0.1.0
 * @date 2026-02-21
 */
import type { IAdrCatalog, ITraceValidator } from '../contracts.js';
import type { AdrRef, HeaderTrace, ValidationIssue, ValidationResult } from '../types.js';

function ok(): ValidationResult {
  return { ok: true, issues: [] };
}

export class TraceValidator implements ITraceValidator {
  async validate(input: {
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
    requireDecision?: boolean;
    failOnMissingVersion?: boolean;
  }): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const requireDecision = input.requireDecision ?? false;
    const failOnMissingVersion = input.failOnMissingVersion ?? false;

    for (const t of input.traces) {
      if (!t.baselines || t.baselines.length === 0) {
        issues.push({
          code: 'MISSING_BASELINE',
          severity: 'error',
          filePath: t.filePath,
          message: 'Missing @baseline ADR-xxxx header.',
        });
        continue;
      }

      for (const b of t.baselines) {
        const adr = await input.adrCatalog.getAdr(b.number);
        if (!adr) {
          issues.push({
            code: 'ADR_NOT_FOUND',
            severity: 'error',
            filePath: t.filePath,
            adrNumber: b.number,
            message: `Referenced ADR not found: ${b.number}`,
          });
          continue;
        }
        if (adr.status !== 'Accepted') {
          issues.push({
            code: 'ADR_NOT_ACCEPTED',
            severity: 'error',
            filePath: t.filePath,
            adrNumber: b.number,
            message: `Referenced ADR is not Accepted: ${b.number} (status=${adr.status ?? 'unknown'})`,
          });
        }
      }

      if (requireDecision && t.kind !== 'test' && t.decisions.length === 0) {
        issues.push({
          code: 'NON_TEST_MISSING_DECISION',
          severity: 'error',
          filePath: t.filePath,
          message: 'Non-test governed artifact must include at least one @decision.',
        });
      }

      if (failOnMissingVersion && t.kind !== 'test' && !t.version) {
        issues.push({
          code: 'MISSING_VERSION',
          severity: 'error',
          filePath: t.filePath,
          message: 'Non-test governed artifact must include @version.',
        });
      }
    }

    return { ok: issues.filter((i) => i.severity === 'error').length === 0, issues };
  }

  async validateReverseCoverage(input: {
    traces: HeaderTrace[];
    acceptedAdrs: AdrRef[];
  }): Promise<ValidationResult> {
    const implemented = new Set<string>();
    for (const t of input.traces) for (const b of t.baselines) implemented.add(b.number);

    const orphaned = input.acceptedAdrs.filter((a) => !implemented.has(a.number));
    if (orphaned.length === 0) return ok();

    const issues: ValidationIssue[] = orphaned.map((a) => ({
      code: 'REVERSE_COVERAGE_FAIL',
      severity: 'error',
      adrNumber: a.number,
      message: `ADR is Accepted but has no implementing files: ${a.number}`,
    }));

    return { ok: false, issues };
  }
}
