/** Owned concern: acquire installed Vitest dependency evidence without executing tests. */
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isWebVitestImpactFrontier } from '../vitest/impact';
import {
  isCompleteWebVitestImpactWitness,
  type WebVitestImpactWitness,
} from '../vitest/impactWitness';
import { isWebVitestTestPath, normalizeWebVitestChangedPath } from '../vitest/paths';

function parseImpactWitness(source: string): WebVitestImpactWitness | null {
  try {
    const value: unknown = JSON.parse(source);
    return isCompleteWebVitestImpactWitness(value) ? value : null;
  } catch {
    return null;
  }
}

export function readWebVitestImpactWitness(
  paths: readonly string[],
  options: Readonly<{ webRoot: string; full?: boolean }>
): WebVitestImpactWitness | null {
  if (!isWebVitestImpactFrontier(paths, options.full)) return null;
  const normalized = paths.map((path) => normalizeWebVitestChangedPath(path)!);
  try {
    if (!normalized.every((path) => statSync(resolve(options.webRoot, path)).isFile())) return null;
  } catch {
    return null;
  }
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(import.meta.url), '--query', ...normalized],
    {
      cwd: options.webRoot,
      encoding: 'utf8',
      shell: false,
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    }
  );
  return result.status === 0 ? parseImpactWitness(result.stdout) : null;
}

export async function queryWebVitestImpactWitness(
  paths: readonly string[],
  webRoot: string
): Promise<WebVitestImpactWitness> {
  const { createVitest } = await import('vitest/node');
  const context = await createVitest({
    root: webRoot,
    config: resolve(webRoot, 'vitest.config.ts'),
    watch: false,
    run: true,
  });
  const localPath = (file: string): string => relative(webRoot, file).replaceAll('\\', '/');
  try {
    const testFiles = (await context.globTestSpecifications()).map((spec) =>
      localPath(spec.moduleId)
    );
    const sources: { path: string; tests: string[] }[] = [];
    for (const path of paths.filter((path) => !isWebVitestTestPath(path))) {
      context.config.related = [resolve(webRoot, path).replaceAll('\\', '/')];
      const tests = (await context.getRelevantTestSpecifications()).map((spec) =>
        localPath(spec.moduleId)
      );
      sources.push({ path, tests });
    }
    return { testFiles, sources };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  if (process.argv[2] !== '--query')
    throw new Error('Private Vitest impact query requires --query');
  const evidence = await queryWebVitestImpactWitness(process.argv.slice(3), process.cwd());
  process.stdout.write(JSON.stringify(evidence));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
