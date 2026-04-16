import { describe, expect, it } from 'vitest';

import { parseStartRunSelection } from '../../../src/entrypoints/http/startRunRouteSelectionParser.js';

describe('parseStartRunSelection', () => {
  it('accepts an empty selection array', () => {
    expect(parseStartRunSelection([])).toEqual({ ok: true, value: [] });
  });

  it('rejects selections with surrounding whitespace', () => {
    expect(parseStartRunSelection([' model_a ', 'model_b'])).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_selection', target: 'selection' },
    });
  });

  it('rejects non-string entries', () => {
    expect(parseStartRunSelection(['model_a', 123])).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_selection', target: 'selection' },
    });
  });

  it('rejects whitespace-only entries', () => {
    expect(parseStartRunSelection(['model_a', '   '])).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_selection', target: 'selection' },
    });
  });
});
