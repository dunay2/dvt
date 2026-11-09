/**
 * Owned concern: start the pre-React bootstrap screen and mount the application.
 * Reason: HTML owns cascade registration; global overrides remain after App
 * so vendor styling keeps its existing priority.
 */
import { createRoot } from 'react-dom/client';

import App from './app/App.tsx';
import { startBootstrapScreen } from './app/bootstrap/appBootstrapScreen.ts';
import './styles/index.css';

startBootstrapScreen();
createRoot(document.getElementById('root')!).render(<App />);
