/**
 * Owned concern: mount the application and report its initial hydration step.
 * Reason: HTML owns cascade registration; global overrides remain after App
 * so vendor styling keeps its existing priority.
 */
import { createRoot } from 'react-dom/client';

import App from './app/App.tsx';
import {
  setBootstrapStepStatus,
  startBootstrapScreen,
} from './app/bootstrap/appBootstrapScreen.ts';
import { createHydrationCompleteBootstrapCommand } from './app/bootstrap/appBootstrapCommands.ts';
import './styles/index.css';

startBootstrapScreen();
createRoot(document.getElementById('root')!).render(<App />);
requestAnimationFrame(() => {
  setBootstrapStepStatus(createHydrationCompleteBootstrapCommand());
});
