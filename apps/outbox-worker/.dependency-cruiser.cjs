/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-outbox-worker-to-engine',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^@dvt/engine($|/)' },
    },
    {
      name: 'no-production-to-delivery-testing',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^@dvt/delivery/testing$' },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
