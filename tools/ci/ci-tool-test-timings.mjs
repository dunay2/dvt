/**
 * Owned concern: project bounded native file observations into a timing read model.
 * Why: producer cost, harness time and suite wall time represent different observations.
 * Corner: missing or malformed observations remain partial; they never authorize acceptance.
 */
import path from 'node:path';

const COUNT_KEYS = [
  'tests',
  'passed',
  'failed',
  'cancelled',
  'skipped',
  'todo',
  'suites',
  'topLevel',
];
const duration = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const ordered = (values) => [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

function observedCounts(value) {
  if (!value || !COUNT_KEYS.every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0)) {
    return null;
  }
  return Object.fromEntries(COUNT_KEYS.map((key) => [key, value[key]]));
}

export class CiToolTestTimings {
  constructor(files, root = process.cwd()) {
    if (
      !Array.isArray(files) ||
      files.length === 0 ||
      files.some((file) => typeof file !== 'string' || !file)
    ) {
      throw new TypeError('Timing observations require explicit selected file paths');
    }
    this.root = root;
    this.expected = new Set(files.map((file) => this.absolute(file)));
    if (this.expected.size !== files.length)
      throw new TypeError('Selected timing paths must be unique');
    this.files = new Map();
    this.harness = new Map();
    this.issues = new Set();
    this.global = null;
  }

  absolute(file) {
    return path.resolve(this.root, file.replaceAll('\\', '/'));
  }

  display(file) {
    return path.relative(this.root, file).replaceAll('\\', '/');
  }

  observe(event) {
    const data = event?.data;
    if (!data || typeof data !== 'object') return [];
    if (event.type === 'test:summary') {
      if (data.file === undefined) {
        if (this.global) this.issues.add('duplicate-global-summary');
        else
          this.global = {
            counts: observedCounts(data.counts),
            duration_ms: data.duration_ms,
            success: data.success,
          };
      } else if (typeof data.file === 'string' && this.expected.has(this.absolute(data.file))) {
        const counts = observedCounts(data.counts);
        if (!counts || !duration(data.duration_ms)) this.issues.add('invalid-harness-summary');
        else if (this.harness.has(this.absolute(data.file)))
          this.issues.add('duplicate-harness-summary');
        else
          this.harness.set(this.absolute(data.file), {
            counts,
            harnessDurationMs: data.duration_ms,
          });
      }
      return [];
    }
    if (
      event.type !== 'test:complete' ||
      data.nesting !== 0 ||
      typeof data.file !== 'string' ||
      typeof data.name !== 'string' ||
      data.line !== 1 ||
      data.column !== 1
    )
      return [];
    const file = this.absolute(data.file);
    if (!this.expected.has(file) || this.absolute(data.name) !== file) return [];
    if (!duration(data.details?.duration_ms) || typeof data.details?.passed !== 'boolean') {
      this.issues.add('invalid-file-completion');
      return [];
    }
    if (this.files.has(file)) {
      this.issues.add('duplicate-file-completion');
      return [];
    }
    const record = {
      version: 1,
      type: 'producer',
      file: this.display(file),
      durationMs: data.details.duration_ms,
      passed: data.details.passed,
    };
    this.files.set(file, record);
    return [record];
  }

  finish() {
    const missingFiles = ordered(
      [...this.expected].filter((file) => !this.files.has(file)).map((file) => this.display(file))
    );
    const counts = observedCounts(this.global?.counts);
    if (!this.global) this.issues.add('missing-global-summary');
    else if (
      !counts ||
      !duration(this.global.duration_ms) ||
      typeof this.global.success !== 'boolean'
    ) {
      this.issues.add('invalid-global-summary');
    }
    if (missingFiles.length || this.issues.size) {
      return {
        version: 1,
        type: 'partial',
        observedFiles: this.files.size,
        missingFiles,
        diagnostics: ordered(this.issues),
      };
    }
    const ranking = [...this.files]
      .map(([file, record]) => ({
        ...record,
        counts: this.harness.get(file)?.counts ?? null,
        harnessDurationMs: this.harness.get(file)?.harnessDurationMs ?? null,
      }))
      .sort(
        (a, b) => b.durationMs - a.durationMs || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0)
      );
    return {
      version: 1,
      type: 'summary',
      complete: true,
      outcome: this.global.success ? 'passed' : 'failed',
      nativeDurationMs: this.global.duration_ms,
      counts,
      ranking,
    };
  }
}
