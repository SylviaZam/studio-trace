import { useEffect, useRef } from 'react';
import { FLOW_PATH } from './SiteNav';
import './WhyOverlay.css';

const ARGUMENTS = [
  {
    n: '01',
    title: 'A tool label answers the wrong question',
    body: [
      '“Made with AI” flattens everything into one flag. It covers the person who asked a model to rename a layer and the person who typed a sentence and shipped what came back. Those are not the same act, and a checkbox cannot tell them apart.',
      'The question worth answering is not whether a machine was present. It is who decided.',
    ],
  },
  {
    n: '02',
    title: 'The judgment is the work',
    body: [
      'In design, the value was never in producing options. It is in choosing against the easy one, noticing what a suggestion quietly assumes, and throwing out the version that tested well but said the wrong thing.',
      'A disclosure that lists tools records the least interesting part of the process and omits the part that was actually yours.',
    ],
  },
  {
    n: '03',
    title: 'Responsibility needs a subject',
    body: [
      'If a claim in the work is wrong, a pattern is inaccessible, or a form is borrowed from someone uncredited, a person has to be answerable for it. Attribution with no one behind it is not attribution.',
      'Naming what you verified — and against what — is how responsibility stays attached to the work after it leaves your hands.',
    ],
  },
  {
    n: '04',
    title: 'Critique lands on the wrong target without it',
    body: [
      'Feedback depends on knowing what the maker intended. In a crit, a reviewer who cannot tell which decisions were yours ends up responding to choices nobody made on purpose.',
      'Saying where the tool entered the process makes the conversation about your reasoning again.',
    ],
  },
  {
    n: '05',
    title: 'Being specific protects you',
    body: [
      'Silence invites the worst assumption: that any AI involvement means the whole thing was automated. Vagueness reads as something to hide.',
      'An account of what you rejected and what you checked is the strongest answer to that, and it is one only you can write.',
    ],
  },
];

export default function WhyOverlay({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // A native modal dialog rather than a div with role="dialog": it traps
  // focus for free, so a keyboard user cannot tab out into the blurred
  // landing behind, and it renders in the top layer, above the veil.
  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    heading.current?.focus();
    return () => { if (node?.open) node.close(); };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="why-overlay"
      aria-labelledby="why-title"
      data-state={closing ? 'closing' : 'open'}
      // Esc fires cancel; take it over so the exit animation still runs.
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="why-panel">
        <button type="button" className="why-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <header className="why-head">
          <p className="landing-kicker">Why disclose</p>
          <h1 className="why-title" id="why-title" ref={heading} tabIndex={-1}>
            The tool is not
            <br />
            the <span className="why-accent">author</span>
          </h1>
          <p className="why-lede">
            Studio Trace exists because the common forms of AI disclosure record what software touched a file and
            almost nothing about who exercised judgment over it. Those are different claims, and only one of them
            tells a reader anything.
          </p>
        </header>

        <div className="why-list">
          {ARGUMENTS.map((item) => (
            <section key={item.n} className="why-item">
              <p className="landing-kicker why-item-n">{item.n}</p>
              <div className="why-item-body">
                <h2 className="why-item-title">{item.title}</h2>
                {item.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="why-limits">
          <h2 className="why-item-title">What this is not</h2>
          <p>
            A Studio Trace record is a self-report. It does not verify your identity, your sources, or your
            authorship, and it says so on every export. Nobody checks it. It is a structured way to say what you did,
            in your own words — closer to a colophon than a certificate.
          </p>
          <p>
            That limit is deliberate. A credential you could not actually earn would be worth less than an honest
            account you can.
          </p>
        </section>

        <section className="why-cta">
          <h2 className="why-cta-title">Write one for a piece you have finished</h2>
          <p className="why-lede">
            Five questions, about four minutes. Nothing leaves your browser, and no AI writes any part of it — the
            record is only worth reading because a person wrote it.
          </p>
          <a className="landing-btn landing-btn--action" href={FLOW_PATH}>
            Start your passport <span className="landing-arrow">→</span>
          </a>
        </section>
      </div>
    </dialog>
  );
}
