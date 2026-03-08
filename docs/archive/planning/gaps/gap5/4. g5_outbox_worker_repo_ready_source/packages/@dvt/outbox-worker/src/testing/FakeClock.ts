import type { IClock } from '../contracts/IClock.js';

export class FakeClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  advanceByMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
