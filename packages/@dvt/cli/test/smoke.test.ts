import { expect, test } from 'vitest';

import { cliPackageSurface } from '../src/index.js';

test('cli package exposes its script-oriented runtime surface', () => {
  expect(cliPackageSurface).toEqual({
    ownedConcern: 'runtime CLI validation and golden-path script surface',
    userFacingCli: false,
    commands: ['validate-contracts', 'run-golden-paths'],
  });
});
