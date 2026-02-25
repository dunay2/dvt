'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InMemoryEventBus = void 0;
class InMemoryEventBus {
  constructor() {
    this.published = [];
  }
  async publish(events) {
    this.published.push(...events);
  }
}
exports.InMemoryEventBus = InMemoryEventBus;
//# sourceMappingURL=InMemoryEventBus.js.map
