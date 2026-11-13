/**
 * Owned concern: adapt native Node test events into safe timing comments.
 * Why: the existing child owns test execution; this adapter only observes its selected files.
 * Corner: test output, errors and environment values are never copied into observations.
 */
import { CiToolTestTimings } from './ci-tool-test-timings.mjs';

export const CI_TOOL_TIMING_PREFIX = '# ci-tool-timing ';

export default async function* ciToolTestTimingReporter(source, options = {}) {
  const timings = new CiToolTestTimings(
    options.files ?? process.argv.slice(1),
    options.root ?? process.cwd()
  );
  for await (const event of source) {
    for (const observation of timings.observe(event)) {
      yield `${CI_TOOL_TIMING_PREFIX}${JSON.stringify(observation)}\n`;
    }
  }
  yield `${CI_TOOL_TIMING_PREFIX}${JSON.stringify(timings.finish())}\n`;
}
