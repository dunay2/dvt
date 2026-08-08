import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const WEB_APP_ROOT = join(import.meta.dirname, '../..');
const PYTHON_PLUGIN_ROOT = join(WEB_APP_ROOT, 'plugins/python');
const CANVAS_ROOT = import.meta.dirname;

describe('Python Canvas authoring and run architecture', () => {
  it('keeps authoritative Python execution outside the Web application', () => {
    for (const source of readTypeScriptSources(WEB_APP_ROOT)) {
      expect(source).not.toMatch(/from\s+['"]node:child_process['"]/u);
      expect(source).not.toMatch(/from\s+['"]node:vm['"]/u);
      expect(source).not.toContain('EphemeralPythonProcessRuntime');
      expect(source).not.toContain('PYTHON_CODE_PROCESS_WRAPPER');
    }
  });

  it('registers Python as a backend-gated optional plugin and separate Canvas kind', () => {
    const contributions = readFileSync(join(PYTHON_PLUGIN_ROOT, 'pythonContributions.ts'), 'utf8');

    expect(contributions).toContain('backendPluginId: PYTHON_PLUGIN_ID');
    expect(contributions).toContain("kind: 'optional'");
    expect(contributions).toContain("kind: 'python'");
    expect(contributions).toContain("kind: 'python_code_preview'");
    expect(contributions).toContain("sourceFamily: 'python-code'");
  });

  it('preserves the closed SQL-first projection instead of adding language conditionals', () => {
    const transformationProjection = readFileSync(
      join(CANVAS_ROOT, 'previewCompilerGraphSource.ts'),
      'utf8'
    );

    expect(transformationProjection).not.toContain('EXECUTE_PYTHON_CODE');
    expect(transformationProjection).not.toContain('python:code');
    expect(transformationProjection).not.toContain('python_code_preview');
  });

  it('uses the existing Inspector apply model as the single authoring command seam', () => {
    const inspector = readFileSync(join(CANVAS_ROOT, 'canvasInspectorAuthoringModel.ts'), 'utf8');
    const pythonModel = readFileSync(join(CANVAS_ROOT, 'pythonCodeAuthoringModel.ts'), 'utf8');

    expect(inspector).toContain('applyPythonCodeAuthoringDraft');
    expect(inspector).toContain('createPythonCodeAuthoringDraft');
    expect(pythonModel).toContain('metadata.pythonCode');
    expect(pythonModel).not.toContain('localStorage');
    expect(pythonModel).not.toContain('sessionStorage');
  });

  it('projects explicit inputs and dependencies without a kernel or session identifier', () => {
    const projection = readFileSync(join(CANVAS_ROOT, 'canvasPythonExecutionProjection.ts'), 'utf8');

    expect(projection).toContain("stepKind: 'EXECUTE_PYTHON_CODE'");
    expect(projection).toContain('dependsOn:');
    expect(projection).toContain('projectPythonCodeStepTypeConfig');
    expect(projection).not.toContain('kernelId');
    expect(projection).not.toContain('sessionId');
    expect(projection).not.toContain('processId');
  });
});

function readTypeScriptSources(root: string): string[] {
  const sources: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      sources.push(...readTypeScriptSources(path));
    } else if (entry.isFile() && /\.(ts|tsx)$/u.test(entry.name)) {
      sources.push(readFileSync(path, 'utf8'));
    }
  }
  return sources;
}
