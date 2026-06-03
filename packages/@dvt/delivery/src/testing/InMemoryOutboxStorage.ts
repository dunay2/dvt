/**
 * Owned concern: delivery testing facade for in-memory outbox storage.
 *
 * Exposes the Delivery-owned in-memory outbox state machine under the existing
 * testing API while keeping claim, retry, dead-letter, and replay semantics in
 * InMemoryOutboxStorageCore.
 */
import { InMemoryOutboxStorageCore } from './InMemoryOutboxStorageCore.js';

export class InMemoryOutboxStorage extends InMemoryOutboxStorageCore {}
