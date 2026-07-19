import { describe, expect, it, vi } from 'vitest';

import { refreshCanvasExecutionSelectionAuthority } from './canvasExecutionSelectionRecoveryAuthorityAdapter';

describe('refreshCanvasExecutionSelectionAuthority', () => {
  it('completes only when the authority query reports success', async () => {
    const refresh = vi.fn().mockResolvedValue({ isError: false, error: null });

    await expect(refreshCanvasExecutionSelectionAuthority(refresh)).resolves.toBeUndefined();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('rejects a resolved query-error result instead of issuing a false success receipt', async () => {
    const error = new Error('Authoritative DBT analysis failed');

    await expect(
      refreshCanvasExecutionSelectionAuthority(vi.fn().mockResolvedValue({ isError: true, error }))
    ).rejects.toThrow(error);
  });

  it('leaves missing technical detail empty for localized presentation fallback', async () => {
    const failure = await refreshCanvasExecutionSelectionAuthority(
      vi.fn().mockResolvedValue({ isError: true, error: null })
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('');
  });

  it.each(['stale-last-valid', 'invalid', 'unavailable'] as const)(
    'rejects a successful query whose %s DBT projection is not usable authority',
    async (freshness) => {
      const refresh = vi.fn().mockResolvedValue({
        isError: false,
        error: null,
        data: { freshness },
      });

      await expect(
        refreshCanvasExecutionSelectionAuthority<{ freshness: string }>(
          refresh,
          (projection) => projection?.freshness === 'fresh'
        )
      ).rejects.toThrow('');
    }
  );

  it('accepts fresh DBT authority after a successful query', async () => {
    const refresh = vi.fn().mockResolvedValue({
      isError: false,
      error: null,
      data: { freshness: 'fresh' as const },
    });

    await expect(
      refreshCanvasExecutionSelectionAuthority<{ freshness: string }>(
        refresh,
        (projection) => projection?.freshness === 'fresh'
      )
    ).resolves.toBeUndefined();
  });
});
