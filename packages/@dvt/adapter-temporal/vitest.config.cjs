// vitest.config.js
const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})
