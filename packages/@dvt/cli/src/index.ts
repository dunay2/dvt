/**
 * @ownedConcern Runtime CLI validation metadata for script-backed contract and
 * golden-path command surfaces.
 */
export const cliPackageSurface = {
  ownedConcern: 'runtime CLI validation and golden-path script surface',
  userFacingCli: false,
  commands: ['validate-contracts', 'run-golden-paths'],
} as const;
