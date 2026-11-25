/** Owned concern: acquire current test membership only for equivalent complete-plan coverage. */
import { readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import {
  hasCompleteWebVitestPresentationOverlap,
  type WebVitestCommandPlan,
} from '../vitest/commands';

export function readWebVitestCoverageInventory(
  plan: WebVitestCommandPlan,
  webRoot: string
): readonly string[] | null {
  if (!hasCompleteWebVitestPresentationOverlap(plan)) return null;
  try {
    const entries = readdirSync(resolve(webRoot, 'src'), { recursive: true, withFileTypes: true });
    if (entries.some((entry) => entry.isSymbolicLink())) return null;
    return entries
      .filter((entry) => entry.isFile() && /\.(?:test|spec)\.tsx?$/.test(entry.name))
      .map((entry) =>
        relative(webRoot, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/')
      )
      .sort();
  } catch {
    return null;
  }
}
