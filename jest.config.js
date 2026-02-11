/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/engine'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    'engine/**/*.ts',
    '!engine/**/*.d.ts',
    '!engine/**/*.spec.ts',
    '!engine/**/*.test.ts',
    '!engine/**/index.ts',
    '!engine/test/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  verbose: true,
  testTimeout: 10000,
  maxWorkers: '50%',
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
    '^@dvt/engine/(.*)$': '<rootDir>/engine/src/$1',
    '^@dvt/contracts/(.*)$': '<rootDir>/engine/contracts/$1',
    '^@dvt/adapters/(.*)$': '<rootDir>/engine/adapters/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/engine/test/setup.ts'],
  globals: {},
};
