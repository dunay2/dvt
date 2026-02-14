/** @type {import('vitest/config').UserConfig} */
module.exports = {
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
};
