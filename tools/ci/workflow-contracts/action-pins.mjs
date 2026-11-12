/** Owned concern: read GitHub YAML files and their pinned action references.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export function pinnedActionReferences(workflow, action) {
  const escapedAction = action.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const referenceCount = [...workflow.matchAll(new RegExp(`${escapedAction}@`, 'gu'))].length;
  const pins = [
    ...workflow.matchAll(
      new RegExp(`${escapedAction}@([0-9a-f]{40}) # (v\\d+(?:\\.\\d+){1,2})`, 'gu')
    ),
  ].map((match) => ({ sha: match[1], version: match[2] }));

  assert.ok(referenceCount > 0, `workflow must use action: ${action}`);
  assert.equal(pins.length, referenceCount, `${action} references must use a full SHA and version`);
  return pins;
}

export function listYamlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listYamlFiles(entryPath);
    }
    return /\.ya?ml$/u.test(entry.name) ? [entryPath] : [];
  });
}
