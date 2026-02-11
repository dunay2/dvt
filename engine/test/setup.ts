// Test setup file for Vitest
import { vi, beforeEach } from 'vitest';

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
// TODO: Add Temporal mocks when @temporalio/workflow is installed

// Setup test environment
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
