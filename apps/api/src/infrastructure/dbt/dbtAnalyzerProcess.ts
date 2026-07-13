import { execFile } from 'node:child_process';

const ANSI_ESCAPE_SEQUENCE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu');

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

export function normalizeProcessDiagnostic(
  result: ProcessRunResult,
  pathReplacements: readonly (readonly [string, string])[] = []
): string {
  const rawDiagnostic = result.stderr.trim() || result.stdout.trim();
  let diagnostic = extractDbtMessages(rawDiagnostic)
    .replaceAll(ANSI_ESCAPE_SEQUENCE, '')
    .replaceAll(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/gu, '<timestamp>');
  for (const [localPath, replacement] of pathReplacements) {
    diagnostic = diagnostic
      .replaceAll(localPath, replacement)
      .replaceAll(localPath.replaceAll('\\', '/'), replacement)
      .replaceAll(localPath.replaceAll('/', '\\'), replacement);
  }
  diagnostic = diagnostic.trim().slice(0, 16_000);
  return diagnostic.length > 0 ? diagnostic : `dbt parse failed with exit code ${result.exitCode}.`;
}

function extractDbtMessages(raw: string): string {
  return raw
    .split(/\r?\n/u)
    .map((line) => {
      try {
        const parsed = JSON.parse(line) as { readonly info?: { readonly msg?: unknown } };
        return typeof parsed.info?.msg === 'string' ? parsed.info.msg : line;
      } catch {
        return line;
      }
    })
    .join('\n');
}

function numericExitCode(value: string | number | null | undefined): number {
  return typeof value === 'number' ? value : 1;
}
