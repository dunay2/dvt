/** Owned concern: adapt query refresh results to the rejecting recovery authority port. */
type CanvasAuthorityRefreshResult<TAuthority> = Readonly<{
  isError: boolean;
  error: unknown;
  data?: TAuthority;
}>;

function buildRefreshFailure(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string' && error.trim().length > 0) return new Error(error);
  return new Error();
}

export async function refreshCanvasExecutionSelectionAuthority<TAuthority = unknown>(
  refresh: () => Promise<CanvasAuthorityRefreshResult<TAuthority>>,
  isUsableAuthority: (authority: TAuthority | undefined) => boolean = () => true
): Promise<void> {
  const result = await refresh();
  if (result.isError) throw buildRefreshFailure(result.error);
  if (!isUsableAuthority(result.data)) throw buildRefreshFailure(null);
}
