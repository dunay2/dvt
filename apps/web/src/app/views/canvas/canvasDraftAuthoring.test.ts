import { describe, expect, it } from 'vitest';

import { canPersistCanvasDraftAuthoringPayload } from './canvasDraftAuthoring';
import { buildSaveInput } from './canvasDraftRepository.test.fixtures';

describe('canvasDraftAuthoring', () => {
  it('returns false instead of throwing when projected drafts reference unknown canonical nodes', () => {
    const payload = buildSaveInput().draft;
    let result: boolean | undefined;

    expect(() => {
      result = canPersistCanvasDraftAuthoringPayload({
        ...payload,
        canonicalNodes: payload.canonicalNodes.filter((node) => node.id !== 'sink-node'),
      });
    }).not.toThrow();

    expect(result).toBe(false);
  });
});
