import { createHash } from 'node:crypto';

import type {
  DbtProjectAnalysis,
  DbtProjectAnalysisDependency,
  DbtProjectAnalysisResource,
} from '../../application/ports/dbtProjectAnalysis.js';

export function hashDbtAnalysis(
  status: DbtProjectAnalysis['status'],
  contentSetSha256: string,
  resources: readonly DbtProjectAnalysisResource[],
  dependencies: readonly DbtProjectAnalysisDependency[],
  diagnostics: DbtProjectAnalysis['diagnostics']
): string {
  return sha256Hex(stableJson({ status, contentSetSha256, resources, dependencies, diagnostics }));
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJsonValue(nested)])
    );
  }
  return value;
}
