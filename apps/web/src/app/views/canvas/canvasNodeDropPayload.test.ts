import { describe, expect, it } from 'vitest';

import { parseCanonicalNodeDragPayload } from './canvasNodeDropPayload';

function buildPayload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 'transform-node',
    name: 'Transform',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['core'],
    ...overrides,
  });
}

describe('parseCanonicalNodeDragPayload', () => {
  it('returns a canonical node when the drag payload is valid', () => {
    expect(parseCanonicalNodeDragPayload(buildPayload())).toEqual({
      id: 'transform-node',
      name: 'Transform',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: ['core'],
      path: undefined,
      description: undefined,
      lastDuration: undefined,
      lastCost: undefined,
      metadata: undefined,
    });
  });

  it('rejects payloads whose kind is not a canonical plugin node kind', () => {
    expect(parseCanonicalNodeDragPayload(buildPayload({ kind: 'invalid-kind' }))).toBeNull();
  });

  it('rejects payloads whose role or status are outside the canonical sets', () => {
    expect(parseCanonicalNodeDragPayload(buildPayload({ role: 'unknown-role' }))).toBeNull();
    expect(parseCanonicalNodeDragPayload(buildPayload({ status: 'unknown-status' }))).toBeNull();
  });

  it('rejects malformed JSON payloads', () => {
    expect(parseCanonicalNodeDragPayload('{')).toBeNull();
  });
});
