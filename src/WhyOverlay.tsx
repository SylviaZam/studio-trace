import { useEffect, useRef } from 'react';
import './WhyOverlay.css';

const ARGUMENTS = [
  {
    n: '01',
    title: 'A tool label answers the wrong question',
    body: ['When thoroughly analyzing the design process of a project, “Made with AI” won’t cut it.'],
  },
  {
    n: '02',
    title: 'Responsibility needs a subject',
    body: [
      'Inspiration of past ideas can be part of innovation, if a form is borrowed from someone uncredited, a person has to be answerable for it. Attribution with no one behind it is not attribution.',
    ],
  },
  {
    n: '03',
    title: 'Critique lands on the wrong target without it',
    body: [
      'Feedback depends on knowing what the maker intended. Saying where the tool entered the process makes the conversation about your reasoning again.',
    ],
  },
  {
    n: '04',
    title: 'Being specific protects you',
    body: [
      'Silence invites the worst assumption: that any AI involvement means the whole thing was automated. This causes the “Design is dead” misconception.',
      'An account of what you rejected is one only you can write.',
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
            Studio Trace is a tool to facilitate recording the exclusive inputs of the designer and their AI tool used
            for a project.
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

      </div>
    </dialog>
  );
}
