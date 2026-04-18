/**
 * @file packages/@dvt/traceability-service/src/core/issue-baseline.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.4 - Compare traceability failures against an explicit regression baseline
 * @decision Section 4.5 - Use stable issue keys instead of free-form messages for deterministic matching
 * @consequence Push-to-main governance blocks new traceability drift without re-failing the historical debt backlog
 * @version 0.1.0
 * @date 2026-04-18
 */
import type { ValidationIssue, ValidationIssueBaselineEntry, ValidationResult } from '../types.js';

type IssueKeyInput = Pick<ValidationIssueBaselineEntry, 'code' | 'filePath' | 'adrNumber'>;

function normalizeFilePath(filePath: string | undefined): string | undefined {
  return filePath?.replace(/\\/g, '/');
}

function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

export function toValidationIssueBaselineEntry(issue: IssueKeyInput): ValidationIssueBaselineEntry {
  const normalizedFilePath = normalizeFilePath(issue.filePath);

  return {
    code: issue.code,
    ...(normalizedFilePath ? { filePath: normalizedFilePath } : {}),
    ...(issue.adrNumber ? { adrNumber: issue.adrNumber } : {}),
  };
}

export function toValidationIssueKey(issue: IssueKeyInput): string {
  const normalized = toValidationIssueBaselineEntry(issue);
  return `${normalized.code}|${normalized.filePath ?? ''}|${normalized.adrNumber ?? ''}`;
}

export function filterValidationIssues(
  result: ValidationResult,
  baseline: readonly ValidationIssueBaselineEntry[] = []
): ValidationResult {
  if (baseline.length === 0) return result;

  const baselineKeys = new Set(baseline.map((issue) => toValidationIssueKey(issue)));
  const issues = result.issues.filter((issue) => !baselineKeys.has(toValidationIssueKey(issue)));

  return {
    ok: !hasErrors(issues),
    issues,
  };
}
