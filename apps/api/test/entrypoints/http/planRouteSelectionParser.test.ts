import { describe, expect, it } from 'vitest';

import { parsePlanRouteSelection } from '../../../src/entrypoints/http/planRouteSelectionParser.js';

describe('parsePlanRouteSelection', () => {
  it('accepts canonical execution selection payloads', () => {
    expect(parsePlanRouteSelection({ mode: 'explicit', nodeIds: ['model_a'] })).toEqual({
      ok: true,
      value: { mode: 'explicit', nodeIds: ['model_a'] },
    });
  });

  it('rejects selections with surrounding whitespace', () => {
    expect(parsePlanRouteSelection({ mode: 'explicit', nodeIds: [' model_a ', 'model_b'] })).toEqual(
      {
        ok: false,
        issue: { type: 'bad_request', reason: 'invalid_selection', target: 'selection' },
      }
    );
  });

  it('rejects non-string entries', () => {
    expect(parsePlanRouteSelection({ mode: 'explicit', nodeIds: ['model_a', 123] })).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_selection', target: 'selection' },
    });
  });

  it('rejects whitespace-only entries', () => {
    expect(parsePlanRouteSelection({ mode: 'explicit', nodeIds: ['model_a', '   '] })).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_selection', target: 'selection' },
    });
  });
});
