import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Landing from './Landing';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found.');

// No router in the stack: /start is the flow, /why is the essay, everything
// else is the landing. public/_redirects sends any path to index.html so a
// direct load or refresh on either still resolves.
const path = window.location.pathname;

function route() {
  if (path === '/start') return <App />;
  // /why is the landing with the essay already layered over it, so a direct
  // hit or a refresh lands in the same state a click produces.
  return <Landing whyOpenInitially={path === '/why'} />;
}

createRoot(container).render(<StrictMode>{route()}</StrictMode>);
