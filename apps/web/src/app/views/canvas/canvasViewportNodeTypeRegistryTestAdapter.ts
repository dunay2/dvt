import { vi } from 'vitest';

export const resolveNodeKindRegistration = vi.fn();

export function getCanvasViewportRegistryMock(): typeof resolveNodeKindRegistration {
  return resolveNodeKindRegistration;
}

export function resetCanvasViewportNodeTypeRegistryTestAdapter(): void {
  resolveNodeKindRegistration.mockReset();
  resolveNodeKindRegistration.mockImplementation((kind: string) => ({
    minimapColor: kind === 'dvt:transform' ? '#22c55e' : '#6b7280',
  }));
}
