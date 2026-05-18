/**
 * @ownedConcern Expose the compatibility Vitest config for the full web test
 * suite without owning suite partition semantics.
 */
import { defineConfig } from 'vitest/config';

import { createWebVitestConfig } from './vitest.suites';

export default defineConfig(createWebVitestConfig('all'));
