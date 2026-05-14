/**
 * Owned concern: engine in-memory outbox state adapter.
 *
 * Keeps the engine-local state-store vocabulary while delegating Delivery-owned
 * claim, retry, dead-letter, replay, shard, and tenant/run ordering semantics
 * to the reusable in-memory outbox storage core.
 */
import { InMemoryOutboxStorageCore } from '@dvt/delivery/testing';

export class InMemoryOutboxState extends InMemoryOutboxStorageCore {}
