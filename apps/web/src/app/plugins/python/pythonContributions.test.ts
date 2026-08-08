import { describe, expect, it } from 'vitest';

import {
  getAllCanvasRuntimeRegistrations,
  getAllNodeKinds,
  getRuntimePlugins,
} from '../registry';

const UNAVAILABLE = {
  plugins: {
    'dvt.python': { available: false, reason: 'disabled' },
  },
} as const;
const AVAILABLE = {
  plugins: {
    'dvt.python': { available: true },
  },
} as const;

describe('Python plugin runtime projection', () => {
  it('fails closed when the backend capability row is missing or unavailable', () => {
    expect(getRuntimePlugins().some((plugin) => plugin.id === 'dvt.python')).toBe(false);
    expect(
      getRuntimePlugins(UNAVAILABLE).some((plugin) => plugin.id === 'dvt.python')
    ).toBe(false);
    expect(
      getAllCanvasRuntimeRegistrations(UNAVAILABLE).some(
        (registration) => registration.kind === 'python'
      )
    ).toBe(false);
    expect(getAllNodeKinds(UNAVAILABLE).some((nodeKind) => nodeKind.kind === 'python:code')).toBe(
      false
    );
  });

  it('publishes one Python Canvas and one governed node kind when available', () => {
    expect(getRuntimePlugins(AVAILABLE).some((plugin) => plugin.id === 'dvt.python')).toBe(true);
    expect(
      getAllCanvasRuntimeRegistrations(AVAILABLE).find(
        (registration) => registration.kind === 'python'
      )
    ).toMatchObject({
      pluginId: 'dvt.python',
      executionStrategy: {
        kind: 'python_code_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'python-code',
      },
      nodeKinds: [
        expect.objectContaining({
          kind: 'python:code',
          previewStepKind: 'EXECUTE_PYTHON_CODE',
        }),
      ],
    });
  });
});
