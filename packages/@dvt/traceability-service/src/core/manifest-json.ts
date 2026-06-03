/**
 * @file packages/@dvt/traceability-service/src/core/manifest-json.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.3 - Manifest generation remains machine-readable and deterministic
 * @decision Section 4.4 - CI reverse coverage must not dirty committed manifest artifacts
 * @consequence ADR-0000 validation rewrites traceability.manifest.json without creating format drift
 * @version 0.1.0
 * @date 2026-05-05
 */

const jsonPrintWidth = 80;

export function formatTraceabilityManifestJson(manifest: unknown): string {
  const lines = JSON.stringify(manifest, null, 2).split('\n');
  const formatted: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const propertyLine = lines[index] ?? '';
    const valueLine = lines[index + 1];
    const closingLine = lines[index + 2];
    const propertyMatch = propertyLine?.match(/^(\s+"[^"]+": )\[$/);
    const valueMatch = valueLine?.match(/^(\s+)("(?:\\.|[^"\\])*")$/);
    const closingMatch = closingLine?.match(/^(\s+)\](,?)$/);

    if (propertyMatch && valueMatch && closingMatch) {
      const propertyPrefix = propertyMatch[1];
      const stringLiteral = valueMatch[2];
      const trailingComma = closingMatch[2];

      if (!propertyPrefix || !stringLiteral) {
        formatted.push(propertyLine);
        continue;
      }

      const candidate = `${propertyPrefix}[${stringLiteral}]${trailingComma ?? ''}`;

      if (candidate.length <= jsonPrintWidth) {
        formatted.push(candidate);
        index += 2;
        continue;
      }
    }

    formatted.push(propertyLine);
  }

  return `${formatted.join('\n')}\n`;
}
