/**
 * @file tools/docs/lib/report.ts
 * Structured issue reporter for docs governance scripts.
 * Outputs human-readable text and supports machine-readable JSON export.
 */

export type IssueLevel = 'error' | 'warn';

export interface Issue {
  level: IssueLevel;
  file: string;
  msg: string;
  detail?: string;
}

export class Report {
  readonly #issues: Issue[] = [];

  error(file: string, msg: string, detail?: string): void {
    this.#issues.push({ level: 'error', file, msg, detail });
  }

  warn(file: string, msg: string, detail?: string): void {
    this.#issues.push({ level: 'warn', file, msg, detail });
  }

  get issues(): readonly Issue[] {
    return this.#issues;
  }

  get errors(): Issue[] {
    return this.#issues.filter((i) => i.level === 'error');
  }

  get warnings(): Issue[] {
    return this.#issues.filter((i) => i.level === 'warn');
  }

  get exitCode(): number {
    return this.errors.length > 0 ? 1 : 0;
  }

  /** Print all issues to stdout/stderr and a summary line to stderr. */
  print(): void {
    for (const issue of this.#issues) {
      const prefix = issue.level === 'error' ? 'ERROR' : 'WARN ';
      const detail = issue.detail ? ` — ${issue.detail}` : '';
      const line = `${prefix}  ${issue.file}\n       ${issue.msg}${detail}\n`;
      if (issue.level === 'error') {
        process.stderr.write(line);
      } else {
        process.stdout.write(line);
      }
    }

    const { errors, warnings } = this;
    process.stderr.write(
      `\n─── ${errors.length} error(s)  ${warnings.length} warning(s) ───\n`,
    );
  }

  toJSON(): { errors: number; warnings: number; issues: readonly Issue[] } {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      issues: this.#issues,
    };
  }
}
