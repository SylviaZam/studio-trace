import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clipboard, Download, Plus } from 'lucide-react';
import { interviewGuide, microExamples, renderRecord } from '@/lib/trace-record';
import { isModifiedClick, navigate } from './router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Trace = { project: string; discipline: string; intent: string; aiUse: string; accepted: string; rejected: string; verified: string; humanDecisions: string; creator: string; workUrl: string; workVersion: string; example: string };
type DialogKind = 'sample' | 'clear' | null;

const storageKey = 'studio-trace-draft-v1';
const themeKey = 'studio-trace-theme';
const emptyTrace: Trace = { project: '', discipline: '', intent: '', aiUse: '', accepted: '', rejected: '', verified: '', humanDecisions: '', creator: '', workUrl: '', workVersion: '', example: '' };

const sampleTrace: Trace = {
  ...emptyTrace,
  example: 'yes',
  project: 'Transit wayfinding prototype',
  discipline: 'Interaction design',
  intent: 'Help first-time riders understand transfers without adding more visual noise to an already dense map.',
  aiUse: 'I asked Claude to critique the transfer flow against my usability-test notes and to surface questions I had not considered.',
  accepted: 'The suggestion to separate route confidence from route speed. I added a “fewest changes” option and clearer transfer labels.',
  rejected: 'A conversational onboarding sequence. It added steps before the rider could see a route, which conflicted with the observed need for speed.',
  verified: 'I checked every station name and accessibility claim against the transit agency map and service notices.',
  humanDecisions: 'I defined the research question, interpreted participant behavior, chose the information hierarchy, and made every final design decision.',
};

const disciplines = ['Interaction design', 'Graphic design', 'Fashion', 'Illustration', 'Film', 'Photography', 'Animation', 'Other'];

const steps = [
  { label: 'Frame the work', eyebrow: 'Framing', blurb: 'Record what you set out to do before any tool entered the process.', fields: ['project', 'discipline', 'intent'] },
  { label: 'Name the AI role', eyebrow: 'Role of AI', blurb: 'Capture how AI participated without giving it credit for decisions you made.', fields: ['aiUse'] },
  { label: 'Show your judgment', eyebrow: 'Judgment', blurb: 'What you kept and what you turned down belong in the same place.', fields: ['accepted', 'rejected'] },
  { label: 'Record verification', eyebrow: 'Verification', blurb: 'What you checked yourself, against what, and what is still uncertain.', fields: ['verified'] },
  { label: 'Claim your authorship', eyebrow: 'Authorship', blurb: 'The decisions that stayed with you, stated concretely rather than claimed in general.', fields: ['humanDecisions'] },
] as const;

const previewSections = [
  { number: '01', title: 'Creative intent', prompt: 'Awaiting your documentation…', value: (trace: Trace) => trace.intent },
  { number: '02', title: 'Role of AI', prompt: 'Awaiting your documentation…', value: (trace: Trace) => trace.aiUse },
  { number: '03', title: 'Human judgment', prompt: 'Awaiting your documentation…', value: (trace: Trace) => trace.accepted || trace.rejected ? `Accepted or adapted: ${trace.accepted || '—'}\n\nRejected: ${trace.rejected || '—'}` : '' },
  { number: '04', title: 'Verification', prompt: 'Awaiting your documentation…', value: (trace: Trace) => trace.verified },
  { number: '05', title: 'Authorship', prompt: 'Awaiting your documentation…', value: (trace: Trace) => trace.humanDecisions },
];

// Vertical padding comes from .field (18px per the restyle spec); a fixed
// height or py-* utility here would override it.
const inputClass = 'field px-3.5 text-base leading-6';
const areaClass = 'field min-h-[180px] resize-y px-3.5 text-base leading-6';

export default function Home() {
  const [trace, setTrace] = useState<Trace>(emptyTrace);
  const [activeStep, setActiveStep] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [dialogKind, setDialogKind] = useState<DialogKind>(null);
  const [toast, setToast] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Which screen focus was last moved for. Compared by value rather than a
  // "has this run before" flag, because StrictMode invokes effects twice on
  // mount and a bare flag lets the second pass steal focus on first paint.
  const focusedScreen = useRef<string | null>(null);

  const completed = useMemo(() => steps.map((step) => step.fields.every((field) => trace[field as keyof Trace].trim().length > 0)), [trace]);
  const progress = completed.filter(Boolean).length;
  const hasWriting = Object.entries(trace).some(([key, value]) => key !== 'discipline' && value.trim().length > 0);
  const set = (field: keyof Trace, value: string) => setTrace((current) => ({ ...current, [field]: value }));

  // On step change, move focus to the new heading so keyboard and screen
  // reader users land on the question instead of staying on a button that
  // no longer exists. Never on first paint: the page must not steal focus
  // or scroll on load. :focus-visible keeps the ring off for mouse clicks.
  useEffect(() => {
    const screen = reviewMode ? 'review' : `step-${activeStep}`;
    if (focusedScreen.current === null) { focusedScreen.current = screen; return; }
    if (focusedScreen.current === screen) return;
    focusedScreen.current = screen;
    headingRef.current?.focus();
  }, [activeStep, reviewMode]);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    window.queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            const next = { ...emptyTrace };
            for (const key of Object.keys(emptyTrace) as (keyof Trace)[]) {
              const value = (parsed as Record<string, unknown>)[key];
              if (typeof value === 'string') next[key] = value;
            }
            setTrace(next);
          }
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        setDraftReady(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify(trace));
  }, [draftReady, trace]);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(themeKey); } catch { saved = null; }
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      if (theme === 'system') window.localStorage.removeItem(themeKey);
      else window.localStorage.setItem(themeKey, theme);
    } catch { /* storage can be unavailable; the theme still applies for this visit */ }
  }, [theme]);

  useEffect(() => {
    const context = (document as Document & {
      modelContext?: { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> };
    }).modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'get_creative_process_interview',
      title: 'Get a creative process interview question',
      description: 'Return an interview question for the creator. This tool cannot read or write their draft. Ask questions; never author answers.',
      inputSchema: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: Object.keys(microExamples) },
        },
        required: ['section'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute(input: unknown) {
        if (!input || typeof input !== 'object') throw new Error('Choose an interview section.');
        const candidate = input as Record<string, unknown>;
        if (Object.keys(candidate).some(key => key !== 'section')) throw new Error('This interview tool does not accept answers.');
        return interviewGuide(candidate.section);
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  const copyDisclosure = async () => {
    if (progress === 0) return;
    try {
      await navigator.clipboard.writeText(renderRecord(trace, new Date().toISOString()));
      announce('Creative process record copied');
    } catch {
      announce('Copy failed. Try downloading instead.');
    }
  };

  const downloadDisclosure = () => {
    if (progress === 0) return;
    const markdown = renderRecord(trace, new Date().toISOString());
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'creative-process-record.md';
    anchor.click();
    URL.revokeObjectURL(url);
    announce('Creative process record downloaded');
  };

  const goToStep = (index: number) => {
    setActiveStep(index);
    setReviewMode(false);
    setAttemptedStep(null);
  };

  const continueFlow = () => {
    if (!completed[activeStep]) {
      setAttemptedStep(activeStep);
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setAttemptedStep(null);
    if (activeStep < steps.length - 1) setActiveStep((step) => step + 1);
    else setReviewMode(true);
  };

  const requestSample = () => {
    if (hasWriting) setDialogKind('sample');
    else loadSample();
  };

  const loadSample = () => {
    setTrace(sampleTrace);
    setActiveStep(0);
    setReviewMode(false);
    setAttemptedStep(null);
    setDialogKind(null);
    announce('Completed example loaded');
  };

  const clearDraft = () => {
    window.localStorage.removeItem(storageKey);
    setTrace(emptyTrace);
    setActiveStep(0);
    setReviewMode(false);
    setAttemptedStep(null);
    setDialogKind(null);
    announce('Saved draft cleared');
  };

  const fieldError = (field: keyof Trace) => attemptedStep === activeStep && !trace[field].trim();
  const step = steps[activeStep];

  return (
    <main className="studio-page min-h-screen">
      <header className="studio-shell flex min-h-[96px] flex-wrap items-center justify-between gap-x-5 gap-y-3 py-6">
        {/* The only way back to the landing from inside the flow. A plain
            href, so leaving mid-draft is a normal navigation and the draft
            stays in localStorage. The landing sees /start as the referrer
            and plays the tunnel in reverse. */}
        <a
          href="/"
          className="home-link flex items-center gap-3"
          aria-label="Studio Trace, back to the home page"
          onClick={(event) => { if (isModifiedClick(event)) return; event.preventDefault(); navigate('/'); }}
        >
          <img src="/figma-assets/studio-trace-hand.png" alt="" width={28} height={41} className="h-[41px] w-[28px] object-contain" />
          <span className="wordmark whitespace-nowrap text-[17px] leading-none sm:text-[21px]">Studio Trace</span>
        </a>
        <div className="flex items-center gap-3">
          <span className="pill meta">Private · Saved locally</span>
          <div className="theme-toggle" role="group" aria-label="Colour theme">
            {([['light', 'Light'], ['dark', 'Dark']] as const).map(([value, label]) => (
              <button key={value} type="button" className="meta" aria-pressed={theme === value}
                onClick={() => setTheme(theme === value ? 'system' : value)}
                title={theme === value ? `${label} on. Click to follow your system setting.` : `Switch to ${label.toLowerCase()}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="studio-shell pb-16 pt-10">
        <StepRail steps={steps} completed={completed} activeStep={activeStep} reviewMode={reviewMode} onGoToStep={goToStep} />

        {reviewMode ? (
          <ReviewPanel trace={trace} completed={completed} progress={progress} onEdit={goToStep} onCopy={copyDisclosure} onDownload={downloadDisclosure} onSet={set} headingRef={headingRef} />
        ) : (
          <div key={activeStep} className="step-screen">
            <div className="step-question">
              <p className="meta text-[var(--muted)]">{`0${activeStep + 1} / ${step.eyebrow}`}</p>
              <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] font-black uppercase leading-[0.96] tracking-[-0.03em] focus:outline-none">{step.label}</h1>
              <p className="step-helper mt-4 max-w-[46ch] text-base leading-6 text-[var(--muted)]">{step.blurb}</p>
            </div>

            <div className="step-answer">
              {attemptedStep === activeStep && !completed[activeStep] && (
                <p role="alert" className="mb-10 border border-[var(--error)] bg-[var(--error-wash)] px-4 py-3 text-[15px] leading-6 text-[var(--error)]">
                  Complete the highlighted {step.fields.length === 1 ? 'answer' : 'answers'} before continuing.
                </p>
              )}

              <div className="space-y-10">
                {activeStep === 0 && <>
                  <Field htmlFor="project" label="What is the work called?" hint="Use the name your audience will recognize." error={fieldError('project')}>
                    <input id="project" aria-invalid={fieldError('project')} className={inputClass} value={trace.project} onChange={(e) => set('project', e.target.value)} placeholder="e.g. Transit wayfinding prototype" />
                  </Field>
                  <Field htmlFor="discipline" label="Which discipline is this?" error={fieldError('discipline')} group>
                    {/* Real radios styled as chips: arrow-key navigation, one tab
                        stop for the set, and correct announcement all come from
                        the browser. A button/role="radio" version would have to
                        hand-roll roving tabindex to behave the same way. */}
                    <fieldset className="chip-group" aria-labelledby="discipline-label" aria-invalid={fieldError('discipline')}>
                      {disciplines.map((item) => (
                        <label key={item} className="chip">
                          <input type="radio" name="discipline" value={item} checked={trace.discipline === item} onChange={() => set('discipline', item)} />
                          {item}
                        </label>
                      ))}
                    </fieldset>
                  </Field>
                  <Field htmlFor="creator" label="Who made it?" hint="Optional. Your name appears on the record as a self-declared author, not a verified signature.">
                    <input id="creator" className={inputClass} value={trace.creator} onChange={(e) => set('creator', e.target.value)} placeholder="Your name" />
                  </Field>
                  <Field htmlFor="intent" label="What did you set out to make or understand?" hint="Describe your intent before AI entered the process. Link and version details are added during review." error={fieldError('intent')}>
                    <textarea id="intent" aria-describedby="intent-example" aria-invalid={fieldError('intent')} className={areaClass} value={trace.intent} onChange={(e) => set('intent', e.target.value)} placeholder="I wanted to…" />
                  </Field>
                </>}
                {activeStep === 1 && <Field htmlFor="aiUse" label="How did AI participate?" hint="Name the tool, what you asked it to do, and where it entered your process." error={fieldError('aiUse')}>
                  <textarea id="aiUse" aria-describedby="aiUse-example" aria-invalid={fieldError('aiUse')} className={areaClass} value={trace.aiUse} onChange={(e) => set('aiUse', e.target.value)} placeholder="I used [tool] to…" />
                </Field>}
                {activeStep === 2 && <>
                  <Field htmlFor="accepted" label="What did you accept or adapt?" hint="Explain why it improved the work." error={fieldError('accepted')}>
                    <textarea id="accepted" aria-describedby="accepted-example" aria-invalid={fieldError('accepted')} className={areaClass} value={trace.accepted} onChange={(e) => set('accepted', e.target.value)} placeholder="I kept the suggestion to… because…" />
                  </Field>
                  <Field htmlFor="rejected" label="What did you reject?" hint="Rejection is evidence of judgment, not a failed interaction." error={fieldError('rejected')}>
                    <textarea id="rejected" aria-describedby="rejected-example" aria-invalid={fieldError('rejected')} className={areaClass} value={trace.rejected} onChange={(e) => set('rejected', e.target.value)} placeholder="I chose not to… because…" />
                  </Field>
                </>}
                {activeStep === 3 && <Field htmlFor="verified" label="What did you verify?" hint="Include sources, comparisons, or checks you performed yourself." error={fieldError('verified')}>
                  <textarea id="verified" aria-describedby="verified-example" aria-invalid={fieldError('verified')} className={areaClass} value={trace.verified} onChange={(e) => set('verified', e.target.value)} placeholder="I checked… against…" />
                </Field>}
                {activeStep === 4 && <Field htmlFor="humanDecisions" label="Which decisions remained yours?" hint="Be concrete about interpretation, direction, and final choices." error={fieldError('humanDecisions')}>
                  <textarea id="humanDecisions" aria-describedby="humanDecisions-example" aria-invalid={fieldError('humanDecisions')} className={areaClass} value={trace.humanDecisions} onChange={(e) => set('humanDecisions', e.target.value)} placeholder="I remained responsible for…" />
                </Field>}
              </div>

              <div className="mt-12 flex items-center justify-between gap-4">
                <button type="button" disabled={activeStep === 0} onClick={() => goToStep(activeStep - 1)} className="action-back">
                  <span className="btn-arrow">←</span> Back
                </button>
                <button type="button" onClick={continueFlow} aria-disabled={!completed[activeStep]} className="btn btn-primary">
                  {activeStep < steps.length - 1 ? 'Continue' : 'Review record'} <span className="btn-arrow">→</span>
                </button>
              </div>

              <div className="step-utility">
                <button type="button" onClick={requestSample} className="step-utility-link meta">View a completed trace →</button>
                <button type="button" onClick={() => hasWriting ? setDialogKind('clear') : clearDraft()} className="step-utility-link meta">Clear saved draft</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="studio-shell pb-12">
        <details className="max-w-3xl text-[15px] leading-6 text-[var(--muted)]">
          <summary className="cursor-pointer py-3">About Studio Trace and using Claude</summary>
          <p>Created by Sylvia Zamora to help creatives reflect on AI collaboration. Works with Claude and other tools; no AI account or API key is required. The example is fictional. The app does not call Claude or generate your answers.</p>
          <p className="mt-3">Studio Trace deliberately prevents AI from completing a person’s reflection. Claude can act as an interviewer, asking questions that help the creator remember and articulate decisions, but only the creator can author the record.</p>
          <p className="mt-3">To use Claude as a reflection partner, ask: “Interview me about my creative process, one question at a time. Ask what I accepted, rejected, and checked. Do not invent experiences or write my answers.” Write your own account here.</p>
          <p className="mt-3">Built with React, TypeScript, Vite, and Tailwind CSS; deployed on Netlify. Independent project, not affiliated with or endorsed by Anthropic.</p>
        </details>
      </footer>

      <div aria-live="polite" aria-atomic="true" className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 bg-[var(--ink)] px-5 py-3 text-[15px] text-[var(--surface)] transition ${toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`} style={{ boxShadow: 'var(--shadow-float)' }}>{toast}</div>

      <AlertDialog open={dialogKind !== null} onOpenChange={(open) => { if (!open) setDialogKind(null); }}>
        <AlertDialogContent className="panel panel-float max-w-[440px] gap-0 p-0 text-[var(--ink)]">
          <AlertDialogHeader className="items-start gap-2 p-6 text-left">
            <AlertDialogTitle className="text-[22px] font-semibold leading-7 tracking-[-0.01em]">{dialogKind === 'sample' ? 'Replace your current draft?' : 'Clear your saved draft?'}</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6 text-[var(--muted)]">{dialogKind === 'sample' ? 'The completed example will replace what you have written on this device.' : 'Everything you have written will be removed from this browser.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="m-0 flex-row justify-end gap-2 border-t border-[var(--border)] p-4">
            <AlertDialogCancel className="btn btn-quiet">Keep my draft</AlertDialogCancel>
            <AlertDialogAction onClick={dialogKind === 'sample' ? loadSample : clearDraft} className="btn btn-primary">{dialogKind === 'sample' ? 'Load example' : 'Clear draft'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function Field({ htmlFor, label, hint, error, group, children }: { htmlFor: string; label: string; hint?: string; error?: boolean; group?: boolean; children: React.ReactNode }) {
  // Chip groups can't use <label for> (it only binds to a single control),
  // so they get a plain labelled element referenced via aria-labelledby.
  const LabelTag = group ? 'span' : 'label';
  const labelProps = group ? { id: `${htmlFor}-label` } : { htmlFor };
  return (
    <div>
      <LabelTag {...labelProps} className="field-label">{label}</LabelTag>
      {hint && <p className="mt-2.5 max-w-[62ch] text-base leading-6 text-[var(--muted)]">{hint}</p>}
      <div className="mt-3">{children}</div>
      {microExamples[htmlFor] && (
        <details className="group mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-[15px] leading-6 text-[var(--cobalt)]">
            <Plus size={15} className="transition group-open:rotate-45" />
            See a strong example
          </summary>
          <p id={`${htmlFor}-example`} className="mt-1 border border-[var(--border)] bg-[var(--surface)] p-3.5 text-[15px] leading-6 text-[var(--muted)]">{microExamples[htmlFor]}</p>
        </details>
      )}
      {error && <p className="mt-2 text-[15px] leading-6 text-[var(--error)]">Add an answer to continue.</p>}
    </div>
  );
}

function StepRail({ steps, completed, activeStep, reviewMode, onGoToStep }: {
  steps: readonly { label: string }[]; completed: boolean[]; activeStep: number; reviewMode: boolean; onGoToStep: (index: number) => void;
}) {
  const liveText = reviewMode
    ? `Review: all ${steps.length} steps complete`
    : `Step ${activeStep + 1} of ${steps.length}: ${steps[activeStep].label}`;
  return (
    <div className="step-rail">
      <ol className="step-rail-track">
        {steps.map((item, index) => {
          const isCurrent = !reviewMode && activeStep === index;
          // "Current" is where the user is, regardless of whether the step
          // already validates; "complete" is reserved for steps behind them.
          const isComplete = completed[index] && !isCurrent;
          const state = isCurrent ? 'current' : isComplete ? 'complete' : 'pending';
          return (
            <li key={item.label} className="step-rail-seg" data-state={state}>
              {isComplete ? (
                <button type="button" className="step-rail-bar" onClick={() => onGoToStep(index)} aria-label={`Back to ${item.label}`} />
              ) : (
                <span className="step-rail-bar" aria-hidden="true" />
              )}
              <span className="step-rail-label meta">{item.label}</span>
            </li>
          );
        })}
      </ol>
      {/* <output> carries an implicit status role; aria-live is stated anyway
          so the live-region contract does not depend on the mapping. */}
      <output aria-live="polite" className="sr-only">{liveText}</output>
    </div>
  );
}

function ReviewPanel({ trace, completed, progress, onEdit, onCopy, onDownload, onSet, headingRef }: { trace: Trace; completed: boolean[]; progress: number; onEdit: (index: number) => void; onCopy: () => void; onDownload: () => void; onSet: (field: keyof Trace, value: string) => void; headingRef: React.Ref<HTMLHeadingElement> }) {
  const missing = completed.filter((done) => !done).length;
  return (
    <div className="final-screen">
      <p className="meta text-[var(--muted)]">Review</p>
      <h1 ref={headingRef} tabIndex={-1} className="final-title mt-3 focus:outline-none">Your creative process, made visible.</h1>
      <p className="mt-4 max-w-[52ch] text-base leading-6 text-[var(--muted)]">Read the finished record below. Tighten anything that does not clearly show your intent, judgment, verification, or authorship.</p>

      <p className="meta mt-10 text-[var(--muted)]">
        {missing ? `${missing} ${missing === 1 ? 'section needs' : 'sections need'} attention` : 'All five sections are complete · completeness does not verify the claims'}
      </p>

      <div className="summary-card mt-3">
        <div className="summary-head">
          <span className="meta text-[var(--muted)]">Summary</span>
          <span className="meta text-[var(--muted)]">{progress} / 5</span>
        </div>
        {previewSections.map((section, index) => {
          const value = section.value(trace);
          return (
            <div key={section.title} className="summary-row">
              <span className="summary-check" data-done={completed[index]} aria-hidden="true">
                <Check size={12} strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="meta text-[var(--muted)]">{section.number} / {section.title}</p>
                <p className="summary-value" data-empty={!value}>{value || 'Not documented yet'}</p>
              </div>
              <button type="button" className="summary-edit meta" onClick={() => onEdit(index)}>
                Edit<span className="sr-only"> {section.title}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <h2 className="text-[20px] font-semibold leading-7">Make this reflection citable</h2>
        <p className="mt-2 max-w-[52ch] text-[15px] leading-6 text-[var(--muted)]">Optional context for your reader. Exports include the date from your device. A typed name is self-declared, not a verified signature.</p>
        <div className="mt-6 space-y-6">
          {([['creator', 'Creator name'], ['workUrl', 'Work URL or reference'], ['workVersion', 'Work version (e.g. prototype 2)']] as const).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={key} className="field-label">{label}</label>
              <input id={key} className={`${inputClass} mt-3`} value={trace[key]} onChange={(e) => onSet(key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <p className="meta text-[var(--muted)]">Your record</p>
        <div className="mt-3">
          <TraceDocument trace={trace} progress={progress} />
        </div>
        <p className="mt-4 text-[13px] leading-5 text-[var(--muted)]">Saved in this browser and never uploaded. Avoid confidential client or school work.</p>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
        <button type="button" onClick={onCopy} disabled={progress === 0} className="btn btn-primary"><Clipboard size={16} />Copy record</button>
        <button type="button" onClick={onDownload} disabled={progress === 0} className="btn btn-quiet"><Download size={16} />Download Markdown</button>
        <button type="button" onClick={() => onEdit(0)} className="min-h-11 px-2 text-[15px] leading-6 text-[var(--muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition hover:text-[var(--ink)]">Return to editing</button>
      </div>
    </div>
  );
}

function TraceDocument({ trace, progress }: { trace: Trace; progress: number }) {
  return (
    <article className="disclosure" data-complete={progress === 5}>
      <div className="flex items-center justify-between gap-4">
        <span className="meta text-[var(--muted)]">Studio Trace</span>
        <span className="meta text-[var(--muted)]">05 / 05</span>
      </div>

      <p className="mt-6 text-[13px] leading-5 text-[var(--muted)]">Creative process trace</p>
      <h2 className="disclosure-title mt-2">{trace.project || 'Untitled creative work'}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="pill meta">{trace.discipline || 'Discipline not selected'}</span>
        {trace.example === 'yes' && <span className="pill meta">Illustrative example</span>}
      </div>

      <dl className="mt-5 space-y-1.5">
        {trace.creator && <div className="flex gap-3"><dt className="meta w-20 shrink-0 text-[var(--muted)]">Creator</dt><dd className="meta-value break-words text-[var(--ink)]">{trace.creator}</dd></div>}
        {trace.workUrl && <div className="flex gap-3"><dt className="meta w-20 shrink-0 text-[var(--muted)]">Work</dt><dd className="meta-value break-words text-[var(--ink)]">{trace.workUrl}</dd></div>}
        {trace.workVersion && <div className="flex gap-3"><dt className="meta w-20 shrink-0 text-[var(--muted)]">Version</dt><dd className="meta-value text-[var(--ink)]">{trace.workVersion}</dd></div>}
      </dl>

      <div className="mt-6 border-t border-[var(--border)]">
        {previewSections.map((section) => {
          const text = section.value(trace);
          return (
            <section key={section.title} className="grid grid-cols-[30px_1fr] gap-x-2 border-b border-[var(--border)] py-5">
              <span className="meta text-[var(--muted)]">{section.number}</span>
              <div>
                <h3 className="meta text-[var(--muted)]">{section.title}</h3>
                <p className={`trace-value mt-2 whitespace-pre-line text-[13px] leading-[22px] ${text ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{text || section.prompt}</p>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6">
        <span className={`pill meta ${progress === 5 ? 'pill-green' : ''}`}>{progress} / 5 traced</span>
        <p className="mt-4 text-[13px] leading-5 text-[var(--muted)]">Written by the creator. Studio Trace does not verify identity, sources, or authorship.</p>
      </div>
    </article>
  );
}
