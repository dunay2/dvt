// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ImageWithFallback } from './ImageWithFallback';

describe('ImageWithFallback', () => {
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
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders a fallback image with the failed source preserved', async () => {
    const sourceUrl = 'https://example.invalid/design-preview.png';

    await act(async () => {
      root.render(
        <ImageWithFallback
          alt="Design preview"
          className="preview-image"
          src={sourceUrl}
          style={{ height: '88px', width: '88px' }}
        />
      );
    });

    const originalImage = container.querySelector('img');

    expect(originalImage?.getAttribute('alt')).toBe('Design preview');
    expect(originalImage?.getAttribute('src')).toBe(sourceUrl);

    await act(async () => {
      fireEvent.error(originalImage!);
    });

    const fallbackFrame = container.querySelector('div');
    const fallbackImage = container.querySelector('img[data-original-url]');

    expect(fallbackFrame?.className).toContain('preview-image');
    expect(fallbackImage?.getAttribute('alt')).toBe('Error loading image');
    expect(fallbackImage?.getAttribute('data-original-url')).toBe(sourceUrl);
    expect(fallbackImage?.getAttribute('src')).toContain('data:image/svg+xml;base64');
  });
});
