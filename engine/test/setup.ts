// Test setup file for Jest
import '@testing-library/jest-dom';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Temporal SDK for determinism tests (when Temporal is added)
jest.mock('@temporalio/workflow', () => ({
  workflow: {
    now: jest.fn(() => new Date('2026-02-11T10:00:00.000Z')),
    sleep: jest.fn(),
    getVersion: jest.fn(),
  },
}));

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
