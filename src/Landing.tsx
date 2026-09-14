import { useEffect, useRef, useState } from 'react';
import PointerTrail from './PointerTrail';
import SiteNav, { FLOW_PATH, WHY_PATH } from './SiteNav';
import { cameFrom, isModifiedClick, navigate } from './router';
import WhyOverlay from './WhyOverlay';
import './Landing.css';

// How long the panel's exit animation runs before it is unmounted.
const WHY_CLOSE_MS = 300;

// Navigate just before the dive finishes so the tail overlaps the page load
// instead of the user waiting on a frozen last frame.
const DIVE_MS = 660;

// Did we just come back from the flow? Three ways in, because each covers a
// case the others miss: cameFrom() for an in-page route swap (no new
// document, so no referrer), the referrer for a real link or reload, and the
// navigation type for a back/forward where the browser withholds it. We only
// reverse the dive for an actual return, never for a cold arrival.
function arrivingFromFlow() {
  try {
    if (cameFrom() === FLOW_PATH) return true;
    if (document.referrer) {
      const from = new URL(document.referrer);
      if (from.origin === window.location.origin && from.pathname === FLOW_PATH) return true;
    }
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return nav?.type === 'back_forward';
  } catch {
    return false;
  }
}

// The creative process passport: a 3D type tunnel with a centered card.
// Ported from studio-trace-landing.html. Both CTAs and the nav Start
// button route to the 5-step flow at /start.
export default function Landing({ whyOpenInitially = false }: { whyOpenInitially?: boolean }) {
  const [entering, setEntering] = useState(false);
  const [whyOpen, setWhyOpen] = useState(whyOpenInitially);
  const [whyClosing, setWhyClosing] = useState(false);
  // True when we pushed /why ourselves, so closing can step back through
  // history instead of stacking another entry.
  const pushedWhy = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);
  // Coming back out of the tunnel: start deep inside and pull the camera back
  // to rest. Decided during the first render rather than in an effect, so the
  // page never paints a frame at rest before reversing. Reduced motion lands
  // on the page flat instead.
  const [returning, setReturning] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches && arrivingFromFlow(),
  );
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    window.clearTimeout(closeTimer.current);
  }, []);

  // The essay has its own URL so it stays linkable and the back button works,
  // but it opens as a layer rather than a page load — that is what lets it
  // animate over the corridor instead of replacing it.
  const openWhy = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    window.clearTimeout(closeTimer.current);
    window.history.pushState(null, '', WHY_PATH);
    pushedWhy.current = true;
    setWhyClosing(false);
    setWhyOpen(true);
  };

  const closeWhy = () => {
    if (pushedWhy.current) {
      pushedWhy.current = false;
      window.history.back(); // popstate below runs the exit
      return;
    }
    window.history.pushState(null, '', '/');
    beginWhyExit();
  };

  const beginWhyExit = () => {
    setWhyClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setWhyOpen(false);
      setWhyClosing(false);
    }, WHY_CLOSE_MS);
  };

  // Keep the panel in step with the back/forward buttons.
  useEffect(() => {
    const onPopState = () => {
      const shouldBeOpen = window.location.pathname === WHY_PATH;
      pushedWhy.current = false;
      if (shouldBeOpen) {
        window.clearTimeout(closeTimer.current);
        setWhyClosing(false);
        setWhyOpen(true);
      } else {
        setWhyOpen((open) => { if (open) beginWhyExit(); return open; });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Hold the page behind the panel still while it is open.
  useEffect(() => {
    if (!whyOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [whyOpen]);

  // A back-button restore from bfcache never re-runs the initialiser above,
  // so the reverse has to be re-armed on pageshow as well.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setEntering(false);
      setReturning(true);
      window.setTimeout(() => setReturning(false), 900);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // Fly the camera down the tunnel, then load the flow. Falls through to a
  // plain navigation for reduced motion, and for any click that means "open
  // this somewhere else" (new tab, new window, middle click).
  const enterFlow = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(FLOW_PATH);
      return;
    }

    setEntering(true);
    // Swapped in place rather than loaded, so the dive runs to its end and
    // the flow is simply there — no blank frame at the climax.
    timer.current = window.setTimeout(() => navigate(FLOW_PATH), DIVE_MS);
  };

  return (
    <div
      className="landing"
      data-entering={entering || undefined}
      data-returning={returning || undefined}
      data-veiled={(whyOpen && !whyClosing) || undefined}
    >
      <PointerTrail />

      <div className="landing-stage">
        <SiteNav onStart={enterFlow} onWhy={openWhy} />

      <header className="landing-hero">
        <div className="landing-tunnel" aria-hidden="true">
          <div className="landing-plane landing-plane--top">
            <span className="landing-plane-text">Studio Trace</span>
          </div>
          <div className="landing-plane landing-plane--left">
            <span className="landing-plane-text">
              Your
              <br />
              process
            </span>
          </div>
          <div className="landing-plane landing-plane--right">
            <span className="landing-plane-text">
              Your
              <br />
              <span className="landing-proof">proof</span>
            </span>
          </div>
          <div className="landing-plane landing-plane--bottom">
            <span className="landing-plane-text">Yours to show</span>
          </div>
        </div>
        <div className="landing-grain" aria-hidden="true"></div>

        <div className="landing-card">
          <p className="landing-kicker">
            The creative process passport <b>·</b> free, no account
          </p>
          <h1>Show how the work was made</h1>
          <p className="landing-sub">
            Five questions about your tools, your edits, and what you kept. Studio Trace turns the answers into a
            disclosure you can attach to the piece, so the process travels with the work.
          </p>
          <div className="landing-actions">
            <a className="landing-btn landing-btn--action" href={FLOW_PATH} onClick={enterFlow}>
              Start your passport <span className="landing-arrow">→</span>
            </a>
          </div>
          <p className="landing-meta">5 steps · about 4 minutes · nothing leaves your browser</p>
        </div>
      </header>
      </div>

      {(whyOpen || whyClosing) && <WhyOverlay closing={whyClosing} onClose={closeWhy} />}
    </div>
  );
}
