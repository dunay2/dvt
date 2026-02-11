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
// TODO: Add Temporal mocks when @temporalio/workflow is installed

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
