// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { SourceColumnsPanel } from './SourceColumnsPanel';

const sourceNode: CanonicalNode = {
  id: 'source.auth-audit-events',
  name: 'auth_audit_events',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source'],
  metadata: {
    columns: [
      { name: 'event_id', type: 'text', nullable: false },
      { name: 'actor_id', type: 'text', nullable: false },
      { name: 'metadata', type: 'jsonb', nullable: true },
      { name: 'request_id', type: 'uuid', nullable: true },
      { name: 'tenant_id', type: 'uuid', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'ip_address', type: 'inet', nullable: true },
    ],
    constraints: [
      { name: 'auth_audit_events_pkey', kind: 'primary-key', columns: ['event_id'] },
      { name: 'auth_audit_events_tenant_key', kind: 'unique', columns: ['tenant_id'] },
    ],
    default: 'unsupported-default',
    comment: 'unsupported-database-comment',
    foreignKeys: [{ name: 'unsupported-fk' }],
    indexes: [{ name: 'unsupported-index' }],
  },
};

describe('SourceColumnsPanel', () => {
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

  function render(node: CanonicalNode = sourceNode): void {
    act(() => root.render(<SourceColumnsPanel node={node} />));
  }

  it('renders one-line type cues and only authoritative PK/UK/NN facts', () => {
    render();

    const rows = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="source-column-row"]')
    );
    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.querySelectorAll('[data-slot="source-column-type-cue"]').length === 1)).toBe(true);
    expect(rows.every((row) => row.textContent?.includes('nullable') !== true)).toBe(true);

    const eventId = container.querySelector<HTMLButtonElement>('[data-column-name="event_id"]')!;
    expect(eventId.textContent).toContain('T');
    expect(eventId.textContent).toContain('PK');
    expect(eventId.textContent).not.toContain('NN');

    const actorId = container.querySelector<HTMLButtonElement>('[data-column-name="actor_id"]')!;
    expect(actorId.textContent).toContain('NN');
    expect(actorId.textContent).not.toContain('PK');

    const tenantId = container.querySelector<HTMLButtonElement>('[data-column-name="tenant_id"]')!;
    expect(tenantId.textContent).toContain('U');
    expect(tenantId.textContent).toContain('UK');
    expect(tenantId.textContent).toContain('NN');

    expect(container.querySelector('[data-column-name="metadata"]')?.textContent).toContain('{}');
    expect(container.querySelector('[data-column-name="created_at"]')?.textContent).toContain('DT');
    expect(container.querySelector('[data-column-name="ip_address"]')?.textContent).toContain('IP');
    expect(container.textContent).not.toContain('FK');
    expect(container.textContent).not.toContain('IDX');
    expect(container.textContent).not.toContain('unsupported-default');
    expect(container.textContent).not.toContain('unsupported-database-comment');
  });

  it('filters by column name and keeps the visible count authoritative', () => {
    render();

    const search = container.querySelector<HTMLInputElement>('[data-slot="source-columns-search"]')!;
    act(() => fireEvent.input(search, { target: { value: 'tenant' } }));

    expect(container.querySelectorAll('[data-slot="source-column-row"]')).toHaveLength(1);
    expect(container.querySelector('[data-slot="source-columns-visible-count"]')?.textContent).toContain('1');
    expect(container.textContent).toContain('tenant_id');
    expect(container.textContent).not.toContain('event_id');
  });

  it('moves semantic selection with the keyboard and updates focused detail', () => {
    render();

    const eventId = container.querySelector<HTMLButtonElement>('[data-column-name="event_id"]')!;
    const actorId = container.querySelector<HTMLButtonElement>('[data-column-name="actor_id"]')!;
    expect(eventId.getAttribute('aria-selected')).toBe('true');

    act(() => {
      eventId.focus();
      fireEvent.keyDown(eventId, { key: 'ArrowDown' });
    });

    expect(actorId.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(actorId);
    expect(container.querySelector('[data-slot="source-column-detail"]')?.textContent).toContain('actor_id');
    expect(container.querySelector('[data-slot="source-column-detail"]')?.textContent).toContain('Not null');
  });

  it('renders a coherent empty state when the Source has no imported columns', () => {
    render({ ...sourceNode, metadata: { columns: [], constraints: [] } });

    expect(container.querySelectorAll('[data-slot="source-column-row"]')).toHaveLength(0);
    expect(container.textContent).toContain('No columns are available for this Source.');
  });
});
