import type { IAdrCatalog, ITraceValidator } from '../contracts.js';
import type { AdrRef, HeaderTrace, ValidationIssue, ValidationResult } from '../types.js';

function ok(): ValidationResult {
  return { ok: true, issues: [] };
}

export class TraceValidator implements ITraceValidator {
  async validate(input: {
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
  }): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

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
