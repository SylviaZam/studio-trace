import { useEffect, useState } from 'react';

// A ~30 line client router, deliberately not a dependency. It exists for one
// reason: a full document navigation between the landing and the flow put a
// blank frame in the middle of the tunnel transition (first contentful paint
// landed ~116ms after navigation even on localhost with a warm cache). Both
// screens are already in the same bundle, so swapping them in place removes
// that gap entirely and lets the dive hand over without a cut.

const subscribers = new Set<() => void>();

let previousPath: string | null = null;

export function navigate(to: string) {
  if (to === window.location.pathname) return;
  previousPath = window.location.pathname;
  window.history.pushState(null, '', to);
  subscribers.forEach((notify) => notify());
}

/** Where the user was immediately before the current screen, same-document only. */
export function cameFrom() {
  return previousPath;
}

export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => {
      // A back/forward is also a route change, and the screen being left
      // becomes the previous one.
      previousPath = path;
      setPath(window.location.pathname);
    };
    subscribers.add(sync);
    window.addEventListener('popstate', sync);
    return () => {
      subscribers.delete(sync);
      window.removeEventListener('popstate', sync);
    };
  }, [path]);

  return path;
}

/** True for a link click that the browser should handle itself. */
export function isModifiedClick(event: React.MouseEvent) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}
