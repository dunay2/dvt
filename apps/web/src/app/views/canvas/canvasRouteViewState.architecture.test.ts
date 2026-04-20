import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const ROUTE_VIEW_STATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasRouteViewState.ts'
);

describe('canvasRouteViewState architecture', () => {
  it('depends on direct model seams instead of a legacy presentation facade', () => {
    expect(ROUTE_VIEW_STATE_SOURCE).toContain("'./canvasDraftPresentationModel'");
    expect(ROUTE_VIEW_STATE_SOURCE).toContain("'./canvasRouteInteractionState'");
    expect(ROUTE_VIEW_STATE_SOURCE).toContain("'./canvasDraftTransportErrorState'");
    expect(ROUTE_VIEW_STATE_SOURCE).not.toContain('canvasDraftPresentationState');
  });
});
