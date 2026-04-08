import { describe, expect, it } from 'vitest';
import { resolveCanvasGraphStrategy } from './graphStrategyRegistry';

describe('resolveCanvasGraphStrategy', () => {
  it('defaults to transformation strategy when strategy id is missing', () => {
    const strategy = resolveCanvasGraphStrategy(undefined);
    expect(strategy.id).toBe('transformation');
  });

  it('defaults to transformation strategy for empty or unknown values', () => {
    expect(resolveCanvasGraphStrategy('  ').id).toBe('transformation');
    expect(resolveCanvasGraphStrategy('unknown').id).toBe('transformation');
  });

  it('resolves dbt strategy when explicitly requested', () => {
    const strategy = resolveCanvasGraphStrategy('dbt');
    expect(strategy.id).toBe('dbt');
  });

  it('resolves transformation strategy when explicitly requested', () => {
    const strategy = resolveCanvasGraphStrategy('transformation');
    expect(strategy.id).toBe('transformation');
  });
});
