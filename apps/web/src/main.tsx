import { createRoot } from 'react-dom/client';

import App from './app/App.tsx';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(<App />);

const loadingScreen = document.getElementById('app-loading-screen');
if (loadingScreen) {
  requestAnimationFrame(() => {
    loadingScreen.remove();
  });
}
