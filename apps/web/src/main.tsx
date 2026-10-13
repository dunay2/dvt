/**
 * Owned concern: register the presentation cascade before eager application styles.
 * Reason: component layers must not define global precedence before Tailwind;
 * global overrides still load after App so vendor styling keeps its existing order.
 */
import './styles/cascadeLayers.css';

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
