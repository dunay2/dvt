/**
 * Owned concern: shared runtime-builder type vocabulary for protected-runtime
 * subcomponents.
 */
import { getPgPool } from '../../db/pool.js';

export type RuntimePool = ReturnType<typeof getPgPool>;
