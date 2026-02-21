import type { IAdrCatalog, ITraceValidator } from '../contracts.js';
import type { AdrRef, HeaderTrace, ValidationIssue, ValidationResult } from '../types.js';

function ok(): ValidationResult {
  return { ok: true, issues: [] };
}

export class TraceValidator implements ITraceValidator {
  async validate(input: {
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
    requiredAdrs?: string[];
  }): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const required = new Set((input.requiredAdrs ?? []).map((x) => x.toUpperCase()));

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
        if (required.size > 0 && !required.has(b.number.toUpperCase())) {
          continue;
        }
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
    }

    return { ok: issues.filter((i) => i.severity === 'error').length === 0, issues };
  }

  async validateReverseCoverage(input: {
    traces: HeaderTrace[];
    acceptedAdrs: AdrRef[];
    requiredAdrs?: string[];
  }): Promise<ValidationResult> {
    const implemented = new Set<string>();
    for (const t of input.traces) for (const b of t.baselines) implemented.add(b.number);

    const target =
      input.requiredAdrs && input.requiredAdrs.length > 0
        ? input.acceptedAdrs.filter((a) => input.requiredAdrs?.includes(a.number))
        : input.acceptedAdrs;

    const orphaned = target.filter((a) => !implemented.has(a.number));
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
