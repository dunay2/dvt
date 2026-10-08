// @vitest-environment jsdom
/**
 * Owned concern: prove Source identity remains authoritative and accessible without duplicate labels.
 * @baseline GH-3578: provider text conveys identity; its adjacent glyph is decorative.
 * @decision Cover known and absent provider facts in the existing header tests.
 * @consequence Hiding the glyph never hides provider text or invents connection context.
 * @version 1.0.0
 */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { SourceNodeWorkbenchHeaderIdentity } from './SourceNodeWorkbenchHeaderIdentity';

function sourceNode(metadata: Record<string, unknown>): CanonicalNode {
  return {
    id: 'source-1',
    name: 'aut',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata,
  };
}

describe('SourceNodeWorkbenchHeaderIdentity', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('projects authoritative PostgreSQL provider, relation and connection reference', () => {
    const node = sourceNode({
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'local-postgres-proof',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/dvt/auth_audit_events',
      },
      schema: 'dvt',
      tableName: 'auth_audit_events',
    });

    act(() => root.render(<SourceNodeWorkbenchHeaderIdentity node={node} />));

    expect(container.textContent).toContain('aut');
    expect(container.textContent).toContain('dvt:source');
    expect(container.textContent).toContain('PostgreSQL');
    expect(
      container.querySelector('[data-slot="canvas-source-qualified-resource"]')?.textContent
    ).toBe('dvt.auth_audit_events');
    expect(container.querySelector('[data-slot="canvas-source-connection-ref"]')?.textContent).toBe(
      'local-postgres-proof'
    );
    expect(container.querySelector('[data-slot="canvas-source-provider-icon"] svg')).not.toBeNull();
    const icon = container.querySelector('[data-slot="canvas-source-provider-icon"]');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.hasAttribute('aria-label')).toBe(false);
    expect(
      container
        .querySelector('[data-slot="canvas-source-provider-label"]')
        ?.closest('[aria-hidden="true"]')
    ).toBeNull();
  });

  it('does not invent provider labels or connection context without canonical facts', () => {
    const node = sourceNode({ schema: 'dvt', tableName: 'auth_audit_events' });

    act(() => root.render(<SourceNodeWorkbenchHeaderIdentity node={node} />));

    expect(container.querySelector('[data-slot="canvas-source-provider-label"]')).toBeNull();
    const icon = container.querySelector('[data-slot="canvas-source-provider-icon"]');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.hasAttribute('aria-label')).toBe(false);
    expect(container.querySelector('[data-slot="canvas-source-connection-ref"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-source-qualified-resource"]')?.textContent
    ).toBe('dvt.auth_audit_events');
  });
});
