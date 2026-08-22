// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { ObjectFilePostgresAuthoringDraft } from '../../views/canvas/objectFilePostgresAuthoringModel';
import { ObjectFilePostgresAuthoringFields } from './ObjectFilePostgresAuthoringFields';

const emptyDraft: ObjectFilePostgresAuthoringDraft = {
  storageUri: '',
  sha256: '',
  sizeBytes: '',
  maxBytes: '',
  format: 'csv',
  sourceCredentialRef: '',
  targetRelation: '',
  targetCredentialRef: '',
  columns: [{ sourceField: '', targetColumn: '', dataType: 'text', nullable: true }],
};

function Harness(): JSX.Element {
  const [draft, setDraft] = useState(emptyDraft);
  return (
    <>
      <ObjectFilePostgresAuthoringFields
        nodeId="load-orders"
        disabled={false}
        draft={draft}
        errors={{
          storageUri: 'object_file_storage_uri_invalid',
          sizeBytes: 'object_file_size_invalid',
          maxBytes: 'object_file_max_bytes_invalid',
          columns: 'object_file_column_mapping_invalid',
        }}
        onChange={setDraft}
      />
      <output data-slot="object-uri-draft">{draft.storageUri}</output>
      <output data-slot="column-count-draft">{draft.columns.length}</output>
    </>
  );
}

describe('ObjectFilePostgresAuthoringFields', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useApplicationLanguageStore.setState({ language: 'en' });
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

  it('edits source identity and column mappings through the semantic draft', () => {
    act(() => root.render(<Harness />));

    const uriInput = container.querySelector<HTMLInputElement>('#load-orders-object-uri');
    act(() => {
      fireEvent.input(uriInput!, {
        target: { value: `s3://fixtures/tenants/tenant/${'a'.repeat(64)}` },
      });
    });
    expect(container.querySelector('[data-slot="object-uri-draft"]')?.textContent).toContain(
      's3://fixtures/tenants/tenant/'
    );

    const addColumn = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add column mapping')
    );
    act(() => addColumn?.click());

    expect(container.querySelector('[data-slot="column-count-draft"]')?.textContent).toBe('2');
    expect(
      container.querySelectorAll('[data-slot="object-file-postgres-column-mapping"]')
    ).toHaveLength(2);
  });

  it('removes added mappings but keeps the contract-required final row', () => {
    act(() => root.render(<Harness />));

    const removeLabel = 'Remove column mapping';
    expect(
      container.querySelector<HTMLButtonElement>(`button[aria-label="${removeLabel}"]`)?.disabled
    ).toBe(true);

    const addColumn = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add column mapping')
    );
    act(() => addColumn?.click());

    const removeButtons = container.querySelectorAll<HTMLButtonElement>(
      `button[aria-label="${removeLabel}"]`
    );
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[1]?.disabled).toBe(false);

    act(() => removeButtons[1]?.click());

    expect(container.querySelector('[data-slot="column-count-draft"]')?.textContent).toBe('1');
    expect(
      container.querySelector<HTMLButtonElement>(`button[aria-label="${removeLabel}"]`)?.disabled
    ).toBe(true);
  });

  it('renders actionable localized validation errors at their owning fields', () => {
    act(() => root.render(<Harness />));

    expect(container.textContent).toContain('Use s3://<bucket>/tenants/<tenant>/<sha256>');
    expect(container.textContent).toContain(
      'Object size must be a positive integer, no greater than 50000000 bytes, and no greater than maximum size.'
    );
    expect(container.textContent).toContain(
      'Maximum size must be a positive integer, no greater than 50000000 bytes, and at least object size.'
    );
    expect(container.textContent).toContain('Add at least one unique, valid source-to-target');
  });

  it('renders the same whole-byte constraints in Spanish', () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    act(() => root.render(<Harness />));

    expect(container.textContent).toContain(
      'El tamaño del objeto debe ser un número entero positivo, no superar 50000000 bytes y no superar el tamaño máximo.'
    );
    expect(container.textContent).toContain(
      'El tamaño máximo debe ser un número entero positivo, no superar 50000000 bytes y ser al menos el tamaño del objeto.'
    );
  });
});
