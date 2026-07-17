/** Owned concern: adapt query refresh results to the rejecting recovery authority port. */
type CanvasAuthorityRefreshResult = Readonly<{
  isError: boolean;
  error: unknown;
}>;

function buildRefreshFailure(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string' && error.trim().length > 0) return new Error(error);
  return new Error();
}

export async function refreshCanvasExecutionSelectionAuthority(
  refresh: () => Promise<CanvasAuthorityRefreshResult>
): Promise<void> {
  const result = await refresh();
  if (result.isError) throw buildRefreshFailure(result.error);
}
