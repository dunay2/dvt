import { execFile } from 'node:child_process';

export type ProcessRunInput = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputBytes: number;
}>;

export type ProcessRunResult = Readonly<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

export type DbtProcessRunner = Readonly<{
  run(input: ProcessRunInput): Promise<ProcessRunResult>;
}>;

export const NODE_DBT_PROCESS_RUNNER: DbtProcessRunner = {
  run(input) {
    return new Promise((resolve) => {
      execFile(
        input.executable,
        [...input.args],
        {
          cwd: input.cwd,
          env: input.env,
          timeout: input.timeoutMs,
          maxBuffer: input.maxOutputBytes,
          windowsHide: true,
          encoding: 'utf8',
        },
        (error, stdout, stderr) => {
          resolve({
            exitCode: error === null ? 0 : numericExitCode(error.code),
            stdout,
            stderr,
          });
        }
      );
    });
  },
};

export function buildSanitizedProcessEnvironment(
  source: NodeJS.ProcessEnv,
  isolatedHome: string
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    DBT_SEND_ANONYMOUS_USAGE_STATS: 'false',
    DBT_LOG_FORMAT: 'json',
    HOME: isolatedHome,
    USERPROFILE: isolatedHome,
    TEMP: isolatedHome,
    TMP: isolatedHome,
    PYTHONIOENCODING: 'utf-8',
  };
  for (const key of ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC']) {
    if (source[key] !== undefined) env[key] = source[key];
  }
  return env;
}

export function normalizeProcessDiagnostic(result: ProcessRunResult): string {
  const diagnostic = result.stderr.trim() || result.stdout.trim();
  return diagnostic.length > 0 ? diagnostic : `dbt parse failed with exit code ${result.exitCode}.`;
}

function numericExitCode(value: string | number | null | undefined): number {
  return typeof value === 'number' ? value : 1;
}
