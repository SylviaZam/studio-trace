import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Landing from './Landing';
import { useRoute } from './router';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found.');

// No router dependency: /start is the flow, /why is the landing with the
// essay layered over it, everything else is the landing. Routes are swapped
// in place so the tunnel transition never crosses a document load.
// public/_redirects makes Netlify serve index.html for every path, so a
// direct load or refresh on any of them still resolves.
function Routes() {
  const path = useRoute();

  // A swapped route starts at the top, the way a real navigation would.
  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  if (path === '/start') return <App />;
  return <Landing whyOpenInitially={path === '/why'} />;
}

createRoot(container).render(
  <StrictMode>
    <Routes />
  </StrictMode>,
);
