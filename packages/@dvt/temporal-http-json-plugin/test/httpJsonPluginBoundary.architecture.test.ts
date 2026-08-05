/** Owned concern: keep HTTP acquisition policy outside generic orchestration and network adapters. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../..');
const PLUGIN_SOURCE_ROOT = join(import.meta.dirname, '../src');
const ENGINE_SOURCE_ROOT = join(REPO_ROOT, 'packages/@dvt/engine/src');
const TEMPORAL_ADAPTER_SOURCE_ROOT = join(REPO_ROOT, 'packages/@dvt/adapter-temporal/src');

describe('HTTP JSON plugin boundary architecture', () => {
  it('keeps transport and DNS adapters outside the policy plugin', () => {
    for (const source of readTypeScriptSources(PLUGIN_SOURCE_ROOT)) {
      expect(source).not.toMatch(/from ['"]node:(?:dns|https|net|tls)['"]/u);
      expect(source).not.toContain('S3Client');
      expect(source).not.toContain('DVT_HTTP_JSON_ENDPOINTS');
    }
  });

  it('keeps engine and generic Temporal adapter sources free of HTTP step ownership', () => {
    for (const source of [
      ...readTypeScriptSources(ENGINE_SOURCE_ROOT),
      ...readTypeScriptSources(TEMPORAL_ADAPTER_SOURCE_ROOT),
    ]) {
      expect(source).not.toMatch(/ACQUIRE_HTTP_JSON_ARTIFACT|HttpJsonArtifactPlugin/u);
    }
  });

  it('depends only on governed ports and contracts across workspace boundaries', () => {
    const imports = readTypeScriptSources(PLUGIN_SOURCE_ROOT).flatMap((source) =>
      [...source.matchAll(/from ['"](@dvt\/[^'"]+)['"]/gu)].map((match) => match[1])
    );

    expect(new Set(imports)).toEqual(
      new Set(['@dvt/adapter-temporal', '@dvt/artifacts', '@dvt/contracts'])
    );
  });
});

function readTypeScriptSources(rootDirectory: string): string[] {
  const sources: string[] = [];
  for (const entry of readdirSync(rootDirectory, { withFileTypes: true })) {
    const entryPath = join(rootDirectory, entry.name);
    if (entry.isDirectory()) sources.push(...readTypeScriptSources(entryPath));
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      sources.push(readFileSync(entryPath, 'utf8'));
    }
  }
  return sources;
}
