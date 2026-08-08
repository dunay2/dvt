import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import {
  applyPythonCodeAuthoringDraft,
  createPythonCodeAuthoringDraft,
  projectPythonCodeStepTypeConfig,
  seedPythonCodeNodeMetadata,
  validatePythonCodeAuthoringDraft,
} from './pythonCodeAuthoringModel';

const NODE: CanonicalNode = {
  id: 'python-code-1',
  name: 'Calculate total',
  pluginId: 'dvt.python',
  kind: 'python:code',
  role: 'transform',
  status: 'idle',
  tags: ['authoring'],
  metadata: seedPythonCodeNodeMetadata(),
};

describe('Python code-node authoring', () => {
  it('round-trips source, explicit input, runtime and limits through the Inspector command model', () => {
    const inspectorDraft = createCanvasInspectorNodeDraft(NODE);
    expect(inspectorDraft.pythonCode).toBeDefined();

    const edited = {
      ...inspectorDraft,
      pythonCode: {
        ...inspectorDraft.pythonCode!,
        source: 'result = {"total": inputs["left"] + inputs["right"]}',
        inputsJson: '{\n  "left": 2,\n  "right": 3\n}',
        runtimeRef: 'python-runtime:cpython-3-13',
        timeoutMs: '12000',
        terminationGraceMs: '400',
        maxStdoutBytes: '2048',
        maxStderrBytes: '1024',
        maxResultBytes: '8192',
      },
    };

    expect(validateCanvasInspectorNodeDraft(edited, { node: NODE, nodes: [NODE], edges: [] })).toEqual(
      {}
    );
    const persistedNode = applyCanvasInspectorNodeDraft(NODE, edited);
    const reloaded = createCanvasInspectorNodeDraft(
      JSON.parse(JSON.stringify(persistedNode)) as CanonicalNode
    );

    expect(reloaded.pythonCode).toEqual(edited.pythonCode);
    expect(persistedNode.metadata).toMatchObject({
      language: 'python',
      runtimeRef: 'python-runtime:cpython-3-13',
      code: edited.pythonCode.source,
      pythonCode: {
        source: edited.pythonCode.source,
        inputs: { left: 2, right: 3 },
        runtimeRef: 'python-runtime:cpython-3-13',
        protocolVersion: 'python-json-v1',
        limits: {
          timeoutMs: 12000,
          terminationGraceMs: 400,
          maxStdoutBytes: 2048,
          maxStderrBytes: 1024,
          maxResultBytes: 8192,
        },
      },
    });
  });

  it('projects persisted metadata to the canonical step config with authorized scope', () => {
    const draft = createPythonCodeAuthoringDraft(NODE)!;
    const configured = applyPythonCodeAuthoringDraft(NODE, {
      ...draft,
      source: 'result = inputs["value"] * 2',
      inputsJson: '{"value": 21}',
      runtimeRef: 'python-runtime:cpython-3-13',
    });

    expect(
      projectPythonCodeStepTypeConfig({
        node: configured,
        executionScope: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
      })
    ).toEqual({
      ok: true,
      stepTypeConfig: {
        scope: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        runtimeRef: 'python-runtime:cpython-3-13',
        protocolVersion: 'python-json-v1',
        source: 'result = inputs["value"] * 2',
        inputs: { value: 21 },
        limits: {
          timeoutMs: 30000,
          terminationGraceMs: 500,
          maxStdoutBytes: 4096,
          maxStderrBytes: 4096,
          maxResultBytes: 65536,
        },
      },
    });
  });

  it.each([
    ['non-object input', { inputsJson: '[1, 2]' }, 'inputsJson'],
    ['invalid JSON input', { inputsJson: '{' }, 'inputsJson'],
    ['raw executable path', { runtimeRef: '/usr/bin/python3' }, 'runtimeRef'],
    ['blank source', { source: '' }, 'source'],
    ['invalid timeout', { timeoutMs: '0' }, 'timeoutMs'],
    [
      'termination grace above timeout',
      { timeoutMs: '100', terminationGraceMs: '100' },
      'terminationGraceMs',
    ],
  ])('rejects %s before Graph Draft apply', (_label, patch, expectedField) => {
    const draft = createPythonCodeAuthoringDraft(NODE)!;
    const validation = validatePythonCodeAuthoringDraft({ ...draft, ...patch });

    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.errors).toHaveProperty(expectedField);
  });

  it('fails closed when execution scope is unavailable', () => {
    expect(projectPythonCodeStepTypeConfig({ node: NODE, executionScope: undefined })).toEqual({
      ok: false,
      message: 'Python node Calculate total requires an authorized execution scope.',
    });
  });
});
