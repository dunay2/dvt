/** Owned concern: name heavy web vendor chunks behind pure, testable build rules. */
export function resolveWebManualChunk(id: string): string | undefined {
  if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
    return 'monaco-vendor';
  }

  if (id.includes('@xterm')) {
    return 'terminal-vendor';
  }

  return undefined;
}
