/**
 * @file packages/@dvt/adapter-temporal/test/helpers/workflowComponentGuideSupport.ts
 * @ownedConcern Parse Temporal PlanRef component-guide markdown structures for semantic architecture tests
 * @baseline ADR-0052: PlanRef Continuation Safety
 * @decision Keep architecture tests coupled to semantic guide structure instead of duplicated string fixtures
 * @consequence Guide drift is detected from real documented API/component tables, reducing brittle test repetition
 * @version 1.0.0
 */

export function extractComponentMapRows(markdown: string): ReadonlyMap<string, string> {
  const section = extractSection(markdown, '## Component map');
  const lines = section
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  const rows = lines.slice(2);
  const parsed = new Map<string, string>();

  for (const row of rows) {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 2) {
      continue;
    }

    const moduleCell = cells[0];
    const concernCell = cells[1];
    if (moduleCell.length === 0 || concernCell.length === 0) {
      continue;
    }

    const normalizedModule = moduleCell.replace(/^`|`$/gu, '');
    if (parsed.has(normalizedModule)) {
      throw new Error(`Duplicate component-map row: ${normalizedModule}`);
    }

    parsed.set(normalizedModule, concernCell);
  }

  return parsed;
}

export function extractStoryCoverageIds(markdown: string): readonly string[] {
  const section = extractSection(markdown, '## Story coverage matrix');
  const lines = section
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- `US-'));

  return lines
    .map((line) => /`(US-TPW-\d+)`/u.exec(line)?.[1])
    .filter((id): id is string => id !== undefined);
}

export function extractSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
  const regex = new RegExp(`${escaped}[\\s\\S]*?(?=\\n##\\s|\\n#\\s|$)`, 'u');
  const match = regex.exec(markdown);
  if (match === null) {
    throw new Error(`Missing markdown section: ${heading}`);
  }

  return match[0];
}
