import { execFile } from 'node:child_process';

export type ProcessRunInput = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputBytes: number;
}>;

export type ProcessRunResult = Readonly<
  | {
      kind: 'completed';
      exitCode: number;
      stdout: string;
      stderr: string;
    }
  | {
      kind: 'unavailable';
      reason: 'spawn_failure' | 'timeout' | 'output_limit';
      stdout: string;
      stderr: string;
    }
>;

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
          const exitCode = numericExitCode(error?.code);
          if (error !== null && exitCode === null) {
            resolve({
              kind: 'unavailable',
              reason:
                error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
                  ? 'output_limit'
                  : error.killed
                    ? 'timeout'
                    : 'spawn_failure',
              stdout,
              stderr,
            });
            return;
          }

          resolve({
            kind: 'completed',
            exitCode: exitCode ?? 0,
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

function numericExitCode(value: string | number | null | undefined): number | null {
  return typeof value === 'number' ? value : null;
}
