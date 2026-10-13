/**
 * Owned concern: assert the direct stylesheet ownership contract shared by two component evidence owners.
 * @baseline GH-3629: source ownership is distinct from rendered behavior and browser geometry.
 * @decision Share only identical import, inline-style and declared-class assertions with explicit inputs.
 * @consequence Component readers and semantic-token checks remain in their concern-specific tests.
 * @version 1.0.0
 */
import { expect } from 'vitest';

export function assertComponentStyleOwnership({
  componentSource,
  stylesheetSource,
  stylesheetImport,
}: Readonly<{
  componentSource: string;
  stylesheetSource: string;
  stylesheetImport: string;
}>): void {
  expect(componentSource).toContain(`import styles from '${stylesheetImport}'`);
  expect(componentSource).not.toMatch(/from ['"][^'"]*chrome['"]/u);
  expect(componentSource).not.toMatch(/\bclassName\s*=\s*['"]|\bstyle\s*=/u);
  const usedKeys = new Set(
    [...componentSource.matchAll(/\bstyles\.([A-Za-z_]\w*)/gu)].map((match) => match[1]!)
  );
  const declaredKeys = new Set(
    [...stylesheetSource.matchAll(/\.([A-Za-z_]\w*)\s*(?=[:{])/gu)].map((match) => match[1]!)
  );
  expect(usedKeys.size).toBeGreaterThan(0);
  for (const key of usedKeys) {
    expect(declaredKeys.has(key), `declared class ${key} in ${stylesheetImport}`).toBe(true);
  }
}
