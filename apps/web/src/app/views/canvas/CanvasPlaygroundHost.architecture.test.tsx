import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const PLAYGROUND_HOST_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasPlaygroundHost.tsx'
);

describe('CanvasPlaygroundHost architecture', () => {
  it('keeps first-canvas host HTML in templates while the host builds commands', () => {
    const templateSource = readArchitectureSiblingSource(
      import.meta.dirname,
      'CanvasPlaygroundHost.templates.tsx'
    );

    expect(PLAYGROUND_HOST_SOURCE).toContain("from './CanvasPlaygroundHost.templates'");
    expect(PLAYGROUND_HOST_SOURCE).toContain('onCreateCanvasKind');
    expect(PLAYGROUND_HOST_SOURCE).not.toContain('<div');
    expect(PLAYGROUND_HOST_SOURCE).not.toContain('Button');
    expect(PLAYGROUND_HOST_SOURCE).not.toContain('Card');

    expect(templateSource).toContain('function CanvasPlaygroundHostTemplate(');
    expect(templateSource).not.toContain('CanvasCreateCanvasDocumentCommand');
    expect(templateSource).not.toContain('canvasViewCopy');
  });
});
