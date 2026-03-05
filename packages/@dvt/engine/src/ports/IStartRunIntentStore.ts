/**
 * @file packages/@dvt/engine/src/ports/IStartRunIntentStore.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0013: bootstrapRunTx atomicity
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Pre-dispatch intent log prevents orphaned provider workflows on process crash
 * @consequence Reconciliation can detect and cancel provider workflows that were never bootstrapped
 * @version 1.0.0
 * @date 2026-03-03
 */
import type { IStartRunIntentStore as IStartRunIntentStoreContract } from '@dvt/contracts';

/**
 * Lifecycle of a startRun intent:
 *
 *   PENDING --adapter.startRun()--> DISPATCHED --bootstrapRunTx()--> RESOLVED
 *      |                              |
 *      +-- reconcile (expire) ------> EXPIRED
 *                                     +-- reconcile (cancel) ------> RESOLVED
 */
export type { CreateIntentInput, StartRunIntent, StartRunIntentStatus } from '@dvt/contracts';

/**
 * Canonical contract alias. The source of truth is defined in @dvt/contracts.
 */
export type IStartRunIntentStore = IStartRunIntentStoreContract;
