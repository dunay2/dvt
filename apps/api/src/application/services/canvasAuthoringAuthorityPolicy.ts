import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';

import type {
  CanvasAuthoringAuthorityKey,
  ICanvasAuthoringAuthorityStore,
} from '../ports/canvasAuthoringAuthority.js';

export class CanvasAuthoringAuthorityPolicy {
  public constructor(private readonly store: ICanvasAuthoringAuthorityStore) {}

  public async resolve(key: CanvasAuthoringAuthorityKey): Promise<CanvasAuthoringAuthorityBinding> {
    const stored = await this.store.read(key);
    if (stored) {
      return stored.binding;
    }

    return {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: key.canvasId,
      authority: { kind: 'graph-draft' },
    };
  }
}
