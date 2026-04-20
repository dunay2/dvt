export function formatUnknownError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error === null || error === undefined) {
    return 'Unknown error';
  }

  try {
    const json = JSON.stringify(error);
    return json ?? 'Unknown error';
  } catch {
    return 'Unknown error';
  }
}
