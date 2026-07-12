/** Owned concern: serialize dbt source YAML documents deterministically. */
import { dump as dumpYaml } from 'js-yaml';

import { isRecord } from './warehouseSourceYamlDocument.js';
import type {
  GeneratedSourceYamlFreshness,
  SourceYamlDocument,
  SourceYamlFreshness,
  SourceYamlMetadata,
} from './warehouseSourceYamlTypes.js';

export function serializeSourceDocument(document: SourceYamlDocument): string {
  const lines: string[] = [];
  appendYamlMetadata(lines, { version: 2, ...document.metadata }, 0);
  lines.push('');
  lines.push('sources:');
  for (const source of document.sources) {
    lines.push(`  - name: ${source.name}`);
    if (source.database !== undefined) {
      appendYamlEntry(lines, 'database', source.database, 4);
    }
    if (source.schema !== undefined) {
      appendYamlEntry(lines, 'schema', source.schema, 4);
    }
    appendYamlMetadata(lines, source.metadata, 4);
    if (source.freshness) {
      if (isGeneratedFreshness(source.freshness)) {
        lines.push('    freshness:');
        lines.push('      warn_after:');
        lines.push(`        count: ${source.freshness.warnAfterCount}`);
        lines.push(`        period: ${source.freshness.warnAfterPeriod}`);
        lines.push('      error_after:');
        lines.push(`        count: ${source.freshness.errorAfterCount}`);
        lines.push(`        period: ${source.freshness.errorAfterPeriod}`);
      } else {
        appendYamlEntry(lines, 'freshness', source.freshness, 4);
      }
    }
    lines.push('    tables:');
    for (const table of source.tables) {
      lines.push(`      - name: ${table.name}`);
      if (table.identifier !== undefined) {
        appendYamlEntry(lines, 'identifier', table.identifier, 8);
      }
      appendYamlMetadata(lines, table.metadata, 8);
      if (table.columns.length > 0) {
        lines.push('        columns:');
        for (const column of table.columns) {
          lines.push(`          - name: ${column.name}`);
          if (column.dataType) {
            lines.push(`            data_type: ${column.dataType}`);
          }
          appendYamlMetadata(lines, column.metadata, 12);
          if (column.tests && column.tests.length > 0) {
            appendYamlEntry(lines, 'tests', column.tests, 12);
          }
        }
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function appendYamlMetadata(
  lines: string[],
  metadata: SourceYamlMetadata,
  indentSpaces: number
): void {
  for (const [key, value] of Object.entries(metadata)) {
    appendYamlEntry(lines, key, value, indentSpaces);
  }
}

export function appendYamlEntry(
  lines: string[],
  key: string,
  value: unknown,
  indentSpaces: number
): void {
  if (value === undefined) {
    return;
  }

  const indent = ' '.repeat(indentSpaces);
  const dumped = dumpYaml({ [key]: value }, { lineWidth: -1, noRefs: true, sortKeys: false })
    .trimEnd()
    .split('\n');
  for (const line of dumped) {
    lines.push(`${indent}${line}`);
  }
}

export function isGeneratedFreshness(
  value: SourceYamlFreshness
): value is GeneratedSourceYamlFreshness {
  return (
    isRecord(value) &&
    typeof value.warnAfterCount === 'number' &&
    value.warnAfterPeriod === 'hour' &&
    typeof value.errorAfterCount === 'number' &&
    value.errorAfterPeriod === 'hour'
  );
}
