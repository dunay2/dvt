import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const RECOVERY_BANNER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasRecoveryBanner.tsx'
);

describe('CanvasRecoveryBanner architecture', () => {
  it('renders from explicit banner state instead of branching on controller recovery fields', () => {
    expect(RECOVERY_BANNER_SOURCE).not.toContain('draftRecoveryReason');
    expect(RECOVERY_BANNER_SOURCE).not.toContain("'./useCanvasController'");
    expect(RECOVERY_BANNER_SOURCE).not.toContain('controller:');
  });

  it('keeps recovery banner HTML in templates and state resolution outside JSX', () => {
    const modelSource = readArchitectureSiblingSource(
      import.meta.dirname,
      'canvasRecoveryBannerModel.ts'
    );
    const templateSource = readArchitectureSiblingSource(
      import.meta.dirname,
      'CanvasRecoveryBanner.templates.tsx'
    );

    expect(RECOVERY_BANNER_SOURCE).toContain("from './canvasRecoveryBannerModel'");
    expect(RECOVERY_BANNER_SOURCE).toContain("from './CanvasRecoveryBanner.templates'");
    expect(RECOVERY_BANNER_SOURCE).not.toContain('<div');
    expect(RECOVERY_BANNER_SOURCE).not.toContain('Button');
    expect(RECOVERY_BANNER_SOURCE).not.toContain('canvasViewCopy');

    expect(modelSource).toContain('function resolveCanvasRecoveryBannerViewState(');
    expect(modelSource).not.toContain('JSX.Element');

    expect(templateSource).toContain('function CanvasRecoveryBannerTemplate(');
    expect(templateSource).not.toContain('CanvasDraftPresentationState');
    expect(templateSource).not.toContain('canvasViewCopy');
  });
});
