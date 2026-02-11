// Test setup file for Vitest
import { vi, beforeEach, afterEach } from 'vitest';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock Temporal SDK for determinism tests (when Temporal is added)
vi.mock('@temporalio/workflow', () => ({
  workflow: {
    now: vi.fn(() => 1707641600000), // Timestamp equivalent to 2026-02-11T10:00:00.000Z
    sleep: vi.fn(),
    getVersion: vi.fn(),
  },
}));

// Setup test environment
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
