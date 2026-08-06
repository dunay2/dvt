/** Owned concern: adapt React DOM synchronous commits to the React Router provider contract. */
import { flushSync } from 'react-dom';

export function flushRouterUpdate(update: () => unknown): undefined {
  flushSync(update);
  return undefined;
}
