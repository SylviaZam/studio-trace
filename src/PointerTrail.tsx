import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import './PixelTrail.css';

const PixelTrail = lazy(() => import('./PixelTrail'));

// A missing GPU or an unavailable optional chunk must never interrupt the form.
class TrailBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function PointerTrail() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)');
    const update = () => setEnabled(preference.matches && !document.hidden);
    update();
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  if (!enabled) return null;
  return <div className="pixel-trail-layer" aria-hidden="true">
    <TrailBoundary><Suspense fallback={null}>
      <PixelTrail gridSize={83} trailSize={0.06} maxAge={200} interpolate={3}
        color="#1e45fc" gooeyFilter={{ id: 'custom-goo-filter', strength: 2 }} />
    </Suspense></TrailBoundary>
  </div>;
}
