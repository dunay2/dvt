import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const TEMPORAL_ADAPTER_ROOT = join(import.meta.dirname, '../../adapter-temporal/src');
const PYTHON_PLUGIN_ROOT = join(import.meta.dirname, '../src');

describe('Python runtime plugin architecture boundary', () => {
  it('keeps the generic Temporal adapter free of Python step ownership', () => {
    for (const source of readTypeScriptSources(TEMPORAL_ADAPTER_ROOT)) {
      expect(source).not.toContain('EXECUTE_PYTHON_CODE');
      expect(source).not.toContain('PythonCodeStepActivity');
      expect(source).not.toContain('PythonCodePluginRunner');
      expect(source).not.toContain('PYTHON_CODE_PLUGIN_ID');
    }
  });

  it('keeps child-process ownership outside the plugin domain package', () => {
    for (const source of readTypeScriptSources(PYTHON_PLUGIN_ROOT)) {
      expect(source).not.toContain("from 'node:child_process'");
      expect(source).not.toContain("from 'node:worker_threads'");
      expect(source).not.toContain('spawn(');
    }
  });

  it('owns the canonical kind only through the independently composed profile', () => {
    const activity = readFileSync(join(PYTHON_PLUGIN_ROOT, 'PythonCodeStepActivity.ts'), 'utf8');

    expect(activity).toContain('createPythonCodePluginProfile');
    expect(activity).toContain('EXECUTE_PYTHON_CODE_STEP_KIND');
    expect(activity).toContain('TemporalStepPluginProfile');
  });
});

function readTypeScriptSources(root: string): string[] {
  const sources: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      sources.push(...readTypeScriptSources(path));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      sources.push(readFileSync(path, 'utf8'));
    }
  }
  return sources;
}
