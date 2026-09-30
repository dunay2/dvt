import { fileURLToPath, URL } from 'node:url';

import ts from 'typescript';
import { expect, it } from 'vitest';

it('requires explicit target and visual postures in every internal admission group', () => {
  const configPath = fileURLToPath(new URL('../tsconfig.json', import.meta.url));
  const sourcePath = fileURLToPath(
    new URL('../src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts', import.meta.url)
  );
  const config = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      },
    }
  );
  if (config == null) throw new Error('The contracts compiler configuration must be readable.');
  const options = { ...config.options, noEmit: true, composite: false, incremental: false };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  let probed = false;
  // Compile against the private production type without exporting a test-only API.
  host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = getSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile);
    if (source == null || ts.sys.resolvePath(path) !== ts.sys.resolvePath(sourcePath))
      return source;
    probed = true;
    return ts.createSourceFile(
      path,
      source.text +
        `
declare const missingTarget: Omit<SupportedCapabilityGroup, 'targetConformance'>;
// @ts-expect-error Target conformance must be declared, never inferred.
const rejectedTarget: SupportedCapabilityGroup = missingTarget;
void rejectedTarget;
declare const missingExposure: Omit<SupportedCapabilityGroup, 'visualExposure'>;
// @ts-expect-error Visual exposure must be declared, never inferred.
const rejectedExposure: SupportedCapabilityGroup = missingExposure;
void rejectedExposure;
`,
      languageVersion,
      true
    );
  };
  const program = ts.createProgram([sourcePath], options, host);
  expect(probed).toBe(true);
  expect(
    ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
      code: diagnostic.code,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    }))
  ).toEqual([]);
}, 20_000);
