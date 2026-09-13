export const FLOW_PATH = '/start';
export const WHY_PATH = '/why';

// Shared by the landing and the Why disclose page. onStart lets the landing
// intercept the click to fly the camera down the tunnel first; anywhere else
// it is omitted and the link simply navigates.
export default function SiteNav({ onStart, onWhy }: {
  onStart?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onWhy?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <nav className="landing-nav">
      <a className="landing-wordmark" href="/">
        Studio<span>·</span>Trace
      </a>
      <div className="landing-nav-links">
        {/* "How it works" still points at an anchor that does not exist — left
            in place because only the example link was asked to be removed. */}
        <a href="#how">How it works</a>
        <a href={WHY_PATH} onClick={onWhy}>Why disclose</a>
      </div>
      <a className="landing-nav-cta" href={FLOW_PATH} onClick={onStart}>
        Start
      </a>
    </nav>
  );
}
