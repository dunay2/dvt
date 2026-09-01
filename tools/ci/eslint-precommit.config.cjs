// Fast lint projects the canonical syntax rules without building TypeScript or
// import graphs. Pre-commit uses it for staged files and affected-workspace lint
// uses it for the full mechanical sweep. The canonical config remains the
// authority for changed-file pre-push and PR checks.
module.exports = require('../../eslint.config.cjs').map((config) => ({
  ...config,
  ...(config.languageOptions?.parserOptions?.project
    ? {
        languageOptions: {
          ...config.languageOptions,
          parserOptions: {
            ...config.languageOptions.parserOptions,
            project: false,
          },
        },
      }
    : {}),
  ...(config.settings?.['import/resolver']
    ? {
        settings: {
          ...config.settings,
          'import/resolver': {
            node: config.settings['import/resolver'].node,
          },
        },
      }
    : {}),
  ...(config.rules
    ? {
        rules: {
          ...config.rules,
          ...(Object.hasOwn(config.rules, '@typescript-eslint/no-floating-promises')
            ? { '@typescript-eslint/no-floating-promises': 'off' }
            : {}),
          ...(Object.hasOwn(config.rules, '@typescript-eslint/no-misused-promises')
            ? { '@typescript-eslint/no-misused-promises': 'off' }
            : {}),
          ...(Object.hasOwn(config.rules, '@typescript-eslint/await-thenable')
            ? { '@typescript-eslint/await-thenable': 'off' }
            : {}),
          ...(Object.hasOwn(config.rules, 'import/no-unresolved')
            ? { 'import/no-unresolved': 'off' }
            : {}),
          ...(Object.hasOwn(config.rules, 'import/no-cycle') ? { 'import/no-cycle': 'off' } : {}),
        },
      }
    : {}),
}));
