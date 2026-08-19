// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  HTTP_JSON_AUTHORING_ERROR,
  type HttpJsonArtifactAuthoringDraft,
} from '../../views/canvas/httpJsonArtifactAuthoringModel';
import { HttpJsonArtifactAuthoringFields } from './HttpJsonArtifactAuthoringFields';

const emptyDraft: HttpJsonArtifactAuthoringDraft = {
  endpointRef: '',
  authCredentialRef: '',
  format: 'json',
  expectedSha256: '',
  expectedSizeBytes: '',
  maxBytes: '',
  storageUri: '',
  artifactCredentialRef: '',
  connectTimeoutMs: '',
  requestTimeoutMs: '',
  maxRedirects: '',
};

function Harness(): JSX.Element {
  const [draft, setDraft] = useState(emptyDraft);
  return (
    <>
      <HttpJsonArtifactAuthoringFields
        nodeId="acquire-orders"
        disabled={false}
        draft={draft}
        errors={{
          endpointRef: HTTP_JSON_AUTHORING_ERROR.endpointRef,
          authCredentialRef: HTTP_JSON_AUTHORING_ERROR.authCredentialRef,
          expectedSha256: HTTP_JSON_AUTHORING_ERROR.expectedSha256,
          expectedSizeBytes: HTTP_JSON_AUTHORING_ERROR.expectedSizeBytes,
          maxBytes: HTTP_JSON_AUTHORING_ERROR.maxBytes,
          storageUri: HTTP_JSON_AUTHORING_ERROR.storageUri,
          artifactCredentialRef: HTTP_JSON_AUTHORING_ERROR.artifactCredentialRef,
          connectTimeoutMs: HTTP_JSON_AUTHORING_ERROR.connectTimeoutMs,
          requestTimeoutMs: HTTP_JSON_AUTHORING_ERROR.requestTimeoutMs,
          maxRedirects: HTTP_JSON_AUTHORING_ERROR.maxRedirects,
        }}
        onChange={setDraft}
      />
      <output data-slot="endpoint-ref-draft">{draft.endpointRef}</output>
    </>
  );
}

describe('HttpJsonArtifactAuthoringFields', () => {
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

  it('edits the semantic draft without owning validation or persistence', () => {
    act(() => root.render(<Harness />));

    const endpointInput = container.querySelector<HTMLInputElement>(
      '#acquire-orders-http-json-endpoint-ref'
    );
    act(() => {
      fireEvent.input(endpointInput!, { target: { value: 'http-endpoint:orders' } });
    });

    expect(container.querySelector('[data-slot="endpoint-ref-draft"]')?.textContent).toBe(
      'http-endpoint:orders'
    );
  });

  it('renders English labels and actionable field-owned errors', () => {
    act(() => root.render(<Harness />));

    expect(container.textContent).toContain('HTTP JSON acquisition');
    expect(container.textContent).toContain('Endpoint reference');
    expect(container.textContent).toContain('Use an opaque http-endpoint:<id> reference.');
    expect(container.textContent).toContain(
      'Use an opaque http-auth:<id> reference or leave it empty.'
    );
    expect(container.textContent).toContain(
      'SHA-256 must contain exactly 64 hexadecimal characters.'
    );
    expect(container.textContent).toContain(
      'Expected size must be a positive admitted byte count.'
    );
    expect(container.textContent).toContain(
      'Maximum size must be positive and not smaller than expected size.'
    );
    expect(container.textContent).toContain(
      'Enter the content-addressed S3 URI for the immutable artifact.'
    );
    expect(container.textContent).toContain(
      'Use an opaque object-store:<id> credential reference.'
    );
    expect(container.textContent).toContain(
      'Connection timeout must be between 100 and 30000 ms and not exceed request timeout.'
    );
    expect(container.textContent).toContain('Request timeout must be between 100 and 60000 ms.');
    expect(container.textContent).toContain(
      'Maximum redirects must be an integer between 0 and 5.'
    );
    expect(container.textContent).not.toContain('Revisa este valor.');

    const endpointInput = container.querySelector<HTMLInputElement>(
      '#acquire-orders-http-json-endpoint-ref'
    );
    expect(endpointInput?.getAttribute('aria-describedby')).toBe(
      'acquire-orders-http-json-endpoint-ref-error'
    );
  });

  it('reprojects the same fields and errors through the Spanish application language', () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    act(() => root.render(<Harness />));

    expect(container.textContent).toContain('Adquisición HTTP JSON');
    expect(container.textContent).toContain('Referencia de endpoint');
    expect(container.textContent).toContain('Usa una referencia opaca http-endpoint:<id>.');
    expect(container.textContent).toContain(
      'El máximo de redirecciones debe ser un entero entre 0 y 5.'
    );
    expect(container.textContent).not.toContain('Use an opaque http-endpoint:<id> reference.');
  });
});
