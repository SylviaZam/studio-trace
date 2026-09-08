'use client';

/* oxlint-disable next/no-img-element -- Vinext's next/image shim causes a duplicate-React runtime error; these are local, dimensioned design assets. */

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Clipboard, Download, RotateCcw, Sparkles } from 'lucide-react';
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

type Trace = { project: string; discipline: string; intent: string; aiUse: string; accepted: string; rejected: string; verified: string; humanDecisions: string };
type DialogKind = 'sample' | 'clear' | null;

const storageKey = 'studio-trace-draft-v1';
const emptyTrace: Trace = { project: '', discipline: 'Interaction design', intent: '', aiUse: '', accepted: '', rejected: '', verified: '', humanDecisions: '' };

const sampleTrace: Trace = {
  project: 'Transit wayfinding prototype',
  discipline: 'Interaction design',
  intent: 'Help first-time riders understand transfers without adding more visual noise to an already dense map.',
  aiUse: 'I asked Claude to critique the transfer flow against my usability-test notes and to surface questions I had not considered.',
  accepted: 'The suggestion to separate route confidence from route speed. I added a “fewest changes” option and clearer transfer labels.',
  rejected: 'A conversational onboarding sequence. It added steps before the rider could see a route, which conflicted with the observed need for speed.',
  verified: 'I checked every station name and accessibility claim against the transit agency map and service notices.',
  humanDecisions: 'I defined the research question, interpreted participant behavior, chose the information hierarchy, and made every final design decision.',
};

const steps = [
  { label: 'Frame the work', shortLabel: 'the AI role', fields: ['project', 'discipline', 'intent'] },
  { label: 'Name the AI role', shortLabel: 'your judgment', fields: ['aiUse'] },
  { label: 'Show your judgment', shortLabel: 'verification', fields: ['accepted', 'rejected'] },
  { label: 'Record verification', shortLabel: 'authorship', fields: ['verified'] },
  { label: 'Claim your authorship', shortLabel: 'review', fields: ['humanDecisions'] },
] as const;

const previewSections = [
  { number: '01', title: 'Creative intent', prompt: 'What problem or question guided the work?', value: (trace: Trace) => trace.intent },
  { number: '02', title: 'Role of AI', prompt: 'What did the tool generate, critique, or help explore?', value: (trace: Trace) => trace.aiUse },
  { number: '03', title: 'Human judgment', prompt: 'What did you keep—and what did you reject?', value: (trace: Trace) => trace.accepted || trace.rejected ? `Accepted or adapted: ${trace.accepted || '—'}\n\nRejected: ${trace.rejected || '—'}` : '' },
  { number: '04', title: 'Verification', prompt: 'How did you check the result?', value: (trace: Trace) => trace.verified },
  { number: '05', title: 'Authorship', prompt: 'Which decisions remained yours?', value: (trace: Trace) => trace.humanDecisions },
];

const fieldClass = 'trace-field w-full border border-[var(--gray)] bg-white px-5 text-base leading-6 text-[var(--ink)] outline-none transition placeholder:text-[var(--gray-dark)] hover:border-[var(--ink)] focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue-wash)] aria-invalid:border-[var(--error)] aria-invalid:ring-4 aria-invalid:ring-[var(--error-wash)]';

export default function Home() {
  const [trace, setTrace] = useState<Trace>(emptyTrace);
  const [activeStep, setActiveStep] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [mobileStepsOpen, setMobileStepsOpen] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>(null);
  const [toast, setToast] = useState('');
  const [draftReady, setDraftReady] = useState(false);

  const completed = useMemo(() => steps.map((step) => step.fields.every((field) => trace[field as keyof Trace].trim().length > 0)), [trace]);
  const progress = completed.filter(Boolean).length;
  const hasWriting = Object.entries(trace).some(([key, value]) => key !== 'discipline' && value.trim().length > 0);
  const set = (field: keyof Trace, value: string) => setTrace((current) => ({ ...current, [field]: value }));

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    window.queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) setTrace({ ...emptyTrace, ...(JSON.parse(saved) as Partial<Trace>) });
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
    const context = (document as Document & {
      modelContext?: { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> };
    }).modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();
    const required = ['project', 'intent', 'aiUse', 'accepted', 'rejected', 'verified', 'humanDecisions'] as const;

    void Promise.resolve(context.registerTool({
      name: 'populate_creative_process_passport',
      title: 'Populate creative process passport',
      description: 'Fill the visible StudioTrace passport with a creator’s own account of how AI participated in their work.',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string' }, discipline: { type: 'string' }, intent: { type: 'string' }, aiUse: { type: 'string' },
          accepted: { type: 'string' }, rejected: { type: 'string' }, verified: { type: 'string' }, humanDecisions: { type: 'string' },
        },
        required: [...required],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input: unknown) {
        if (!input || typeof input !== 'object') throw new Error('Passport details must be an object.');
        const candidate = input as Record<string, unknown>;
        if (required.some((field) => typeof candidate[field] !== 'string' || !(candidate[field] as string).trim())) throw new Error('Every passport section must contain the creator’s own account.');
        const next: Trace = {
          project: candidate.project as string,
          discipline: typeof candidate.discipline === 'string' && candidate.discipline.trim() ? candidate.discipline : 'Other',
          intent: candidate.intent as string,
          aiUse: candidate.aiUse as string,
          accepted: candidate.accepted as string,
          rejected: candidate.rejected as string,
          verified: candidate.verified as string,
          humanDecisions: candidate.humanDecisions as string,
        };
        setTrace(next);
        setActiveStep(0);
        setReviewMode(false);
        return { status: 'populated', project: next.project, sectionsComplete: 5 };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  const disclosure = useMemo(() => {
    const title = trace.project || 'Untitled creative work';
    return `${title}\n\nCREATIVE INTENT\n${trace.intent || 'Not recorded yet.'}\n\nROLE OF AI\n${trace.aiUse || 'Not recorded yet.'}\n\nHUMAN JUDGMENT\nAccepted or adapted: ${trace.accepted || 'Not recorded yet.'}\nRejected: ${trace.rejected || 'Not recorded yet.'}\n\nVERIFICATION\n${trace.verified || 'Not recorded yet.'}\n\nAUTHORSHIP\n${trace.humanDecisions || 'Not recorded yet.'}`;
  }, [trace]);

  const copyDisclosure = async () => {
    if (progress === 0) return;
    try {
      await navigator.clipboard.writeText(disclosure);
      announce('Passport copied');
    } catch {
      announce('Copy failed. Try downloading instead.');
    }
  };

  const downloadDisclosure = () => {
    if (progress === 0) return;
    const markdown = `# ${trace.project || 'Creative Process Passport'}\n\n**Discipline:** ${trace.discipline}\n\n${disclosure.split('\n\n').slice(1).map((section) => { const [heading, ...body] = section.split('\n'); return `## ${heading}\n\n${body.join('\n')}`; }).join('\n\n')}\n`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'creative-process-passport.md';
    anchor.click();
    URL.revokeObjectURL(url);
    announce('Passport downloaded');
  };

  const goToStep = (index: number) => {
    setActiveStep(index);
    setReviewMode(false);
    setAttemptedStep(null);
    setMobileStepsOpen(false);
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

  return (
    <main className="min-h-screen bg-white text-[var(--ink)]">
      <header className="mx-auto flex min-h-[104px] w-full max-w-[1728px] items-center justify-between gap-5 px-5 py-4 sm:px-8 xl:min-h-[120px] xl:px-[50px]">
        <div className="flex items-center gap-3" aria-label="Studio Trace">
          <img src="/figma-assets/studio-trace-hand.png" alt="" width={47} height={71} className="h-[58px] w-[39px] object-contain xl:h-[71px] xl:w-[47px]" />
          <span className="studio-wordmark text-[27px] leading-none tracking-[-0.035em] xl:text-[31.68px]">Studio Trace</span>
        </div>
        <div className="flex max-w-[230px] items-center gap-2.5 text-right text-[13px] leading-5 text-[var(--muted)] sm:max-w-none">
          <img src="/figma-assets/privacy-shield.svg" alt="" width={18} height={18} className="size-[18px] shrink-0" />
          <span>Saved only on this device. Nothing is uploaded.</span>
        </div>
      </header>

      <div className="studio-grid mx-auto grid w-full max-w-[1728px] gap-10 px-5 pb-10 pt-7 sm:px-8 xl:grid-cols-[230px_minmax(480px,650px)_minmax(360px,430px)] xl:gap-[clamp(32px,3vw,52px)] xl:px-[50px] xl:pb-[50px] xl:pt-[64px]">
        <aside className="xl:w-[230px]">
          <div className="mb-6 flex items-end justify-between gap-4 xl:block">
            <div>
              <h2 className="text-xl leading-6">Your trace</h2>
              <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">{progress} of 5 sections complete</p>
            </div>
            <progress className="trace-progress h-2 w-28 overflow-hidden rounded-full xl:mt-3.5 xl:w-full" value={progress} max={5} aria-label={`${progress} of 5 sections complete`} />
          </div>

          <div className="rounded-[32px] bg-[var(--blue)] p-5 text-white xl:rounded-[38px] xl:p-7">
            <button type="button" aria-expanded={mobileStepsOpen} onClick={() => setMobileStepsOpen((open) => !open)} className="flex min-h-11 w-full items-center justify-between text-left md:hidden">
              <span><span className="block text-[13px] text-white/70">Step {activeStep + 1} of 5</span><span className="mt-0.5 block text-base">{steps[activeStep].label}</span></span>
              <ChevronDown size={19} className={`transition ${mobileStepsOpen ? 'rotate-180' : ''}`} />
            </button>
            <nav aria-label="Passport sections" className={`${mobileStepsOpen ? 'mt-5 flex' : 'hidden'} flex-col gap-4 md:flex md:flex-row md:overflow-x-auto xl:block xl:space-y-5 xl:overflow-visible`}>
              {steps.map((step, index) => (
                <button key={step.label} type="button" onClick={() => goToStep(index)} className={`group flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-1 py-1 text-left text-sm leading-5 transition focus-visible:outline-white xl:w-full ${!reviewMode && activeStep === index ? 'font-medium' : 'text-white/78 hover:text-white'}`}>
                  <span className={`grid size-[34px] shrink-0 place-items-center rounded-[10px] border text-[13px] transition ${completed[index] ? 'border-[var(--lime)] bg-[var(--lime)] text-[var(--blue)]' : !reviewMode && activeStep === index ? 'border-white bg-white text-[var(--blue)]' : 'border-white/85 bg-transparent text-white'}`}>{completed[index] ? <Check size={16} strokeWidth={2.5} /> : index + 1}</span>
                  <span className="whitespace-nowrap xl:whitespace-normal">{step.label}</span>
                </button>
              ))}
            </nav>
            <button type="button" onClick={requestSample} className="mt-6 flex min-h-11 w-full items-center gap-2 border-t border-white/25 pt-5 text-left text-sm leading-5 text-white/80 transition hover:text-white">
              <Sparkles size={16} />
              <span>Try a completed example</span>
            </button>
          </div>
        </aside>

        <section className="min-w-0 xl:min-h-[790px]">
          {reviewMode ? (
            <ReviewPanel completed={completed} progress={progress} onEdit={goToStep} onCopy={copyDisclosure} onDownload={downloadDisclosure} />
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] text-[var(--muted)]">Section {activeStep + 1} of 5</p>
                  <h1 className="mt-1 text-[clamp(1.75rem,3vw,2.4rem)] leading-[1.05] tracking-[-0.035em]">{steps[activeStep].label}</h1>
                </div>
                <button type="button" onClick={() => hasWriting ? setDialogKind('clear') : clearDraft()} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-[var(--muted)] transition hover:bg-[var(--gray-soft)] hover:text-[var(--ink)]">
                  <RotateCcw size={15} />
                  <span className="hidden sm:inline">Clear saved draft</span>
                </button>
              </div>

              {attemptedStep === activeStep && !completed[activeStep] && <p role="alert" className="mb-6 rounded-[16px] bg-[var(--error-wash)] px-4 py-3 text-sm leading-5 text-[var(--error)]">Complete the highlighted {steps[activeStep].fields.length === 1 ? 'answer' : 'answers'} before continuing.</p>}

              {activeStep === 0 && <div className="space-y-9 xl:space-y-11">
                <Field htmlFor="project" label="Project title" hint="Use the name your audience will recognize." error={fieldError('project')}><input id="project" aria-invalid={fieldError('project')} className={`${fieldClass} h-[52px] rounded-full`} value={trace.project} onChange={(e) => set('project', e.target.value)} placeholder="e.g. Transit wayfinding prototype" /></Field>
                <Field htmlFor="discipline" label="Creative discipline" error={fieldError('discipline')}><div className="relative"><select id="discipline" aria-invalid={fieldError('discipline')} className={`${fieldClass} h-[52px] appearance-none rounded-full pr-12`} value={trace.discipline} onChange={(e) => set('discipline', e.target.value)}>{['Interaction design', 'Graphic design', 'Fashion', 'Illustration', 'Film', 'Photography', 'Animation', 'Other'].map((item) => <option key={item}>{item}</option>)}</select><img src="/figma-assets/caret-down.svg" alt="" width={18} height={18} className="pointer-events-none absolute right-5 top-1/2 size-[18px] -translate-y-1/2" /></div></Field>
                <Field htmlFor="intent" label="What did you set out to make or understand?" hint="Describe your intent before AI entered the process." error={fieldError('intent')}><textarea id="intent" aria-invalid={fieldError('intent')} className={`${fieldClass} min-h-[188px] resize-y rounded-[24px] py-4`} value={trace.intent} onChange={(e) => set('intent', e.target.value)} placeholder="I wanted to…" /></Field>
              </div>}
              {activeStep === 1 && <Field htmlFor="aiUse" label="How did AI participate?" hint="Name the tool, the request, and the stage of your process." error={fieldError('aiUse')}><textarea id="aiUse" aria-invalid={fieldError('aiUse')} className={`${fieldClass} min-h-[250px] resize-y rounded-[24px] py-4`} value={trace.aiUse} onChange={(e) => set('aiUse', e.target.value)} placeholder="I asked Claude to…" /></Field>}
              {activeStep === 2 && <div className="space-y-9">
                <Field htmlFor="accepted" label="What did you accept or adapt?" hint="Explain why it improved the work." error={fieldError('accepted')}><textarea id="accepted" aria-invalid={fieldError('accepted')} className={`${fieldClass} min-h-[180px] resize-y rounded-[24px] py-4`} value={trace.accepted} onChange={(e) => set('accepted', e.target.value)} placeholder="I kept the suggestion to… because…" /></Field>
                <Field htmlFor="rejected" label="What did you reject?" hint="Rejection is evidence of judgment, not a failed interaction." error={fieldError('rejected')}><textarea id="rejected" aria-invalid={fieldError('rejected')} className={`${fieldClass} min-h-[180px] resize-y rounded-[24px] py-4`} value={trace.rejected} onChange={(e) => set('rejected', e.target.value)} placeholder="I chose not to… because…" /></Field>
              </div>}
              {activeStep === 3 && <Field htmlFor="verified" label="What did you verify?" hint="Include sources, comparisons, or checks you performed yourself." error={fieldError('verified')}><textarea id="verified" aria-invalid={fieldError('verified')} className={`${fieldClass} min-h-[250px] resize-y rounded-[24px] py-4`} value={trace.verified} onChange={(e) => set('verified', e.target.value)} placeholder="I checked… against…" /></Field>}
              {activeStep === 4 && <Field htmlFor="humanDecisions" label="Which decisions remained yours?" hint="Be concrete about interpretation, direction, and final choices." error={fieldError('humanDecisions')}><textarea id="humanDecisions" aria-invalid={fieldError('humanDecisions')} className={`${fieldClass} min-h-[250px] resize-y rounded-[24px] py-4`} value={trace.humanDecisions} onChange={(e) => set('humanDecisions', e.target.value)} placeholder="I remained responsible for…" /></Field>}

              <div className="mt-10 flex items-center justify-between border-t border-[var(--gray-light)] pt-6">
                <button type="button" disabled={activeStep === 0} onClick={() => goToStep(activeStep - 1)} className="min-h-12 rounded-full px-4 text-base text-[var(--muted)] transition hover:bg-[var(--gray-soft)] hover:text-[var(--ink)] disabled:invisible">Back</button>
                <button type="button" onClick={continueFlow} className="min-h-12 rounded-full bg-[var(--lime)] px-6 text-base text-[var(--blue)] transition hover:-translate-y-0.5 hover:bg-[var(--lime-bright)]">{activeStep < steps.length - 1 ? `Continue to ${steps[activeStep].shortLabel}` : 'Review passport'}</button>
              </div>
            </>
          )}
        </section>

        <aside className="min-w-0 xl:self-start">
          <Passport trace={trace} completed={completed} activeStep={activeStep} reviewMode={reviewMode} progress={progress} onCopy={copyDisclosure} onDownload={downloadDisclosure} />
          <p className="mt-4 flex gap-2 text-[13px] leading-5 text-[var(--muted)]">
            <img src="/figma-assets/privacy-shield.svg" alt="" width={16} height={16} className="mt-0.5 size-4 shrink-0" />
            <span>Your draft is saved in this browser and never uploaded. Avoid including confidential client or school work.</span>
          </p>
        </aside>
      </div>

      <div aria-live="polite" aria-atomic="true" className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white shadow-lg transition ${toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>{toast}</div>

      <AlertDialog open={dialogKind !== null} onOpenChange={(open) => { if (!open) setDialogKind(null); }}>
        <AlertDialogContent className="max-w-[420px] gap-0 rounded-[28px] border border-[var(--gray)] bg-white p-0 text-[var(--ink)] shadow-2xl">
          <AlertDialogHeader className="items-start gap-2 p-7 text-left">
            <AlertDialogTitle className="text-2xl font-normal tracking-[-0.03em]">{dialogKind === 'sample' ? 'Replace your current draft?' : 'Clear your saved draft?'}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-[var(--muted)]">{dialogKind === 'sample' ? 'The completed example will replace what you have written on this device.' : 'Everything you have written will be removed from this browser.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="m-0 flex-row justify-end gap-2 rounded-b-[28px] border-t border-[var(--gray-light)] bg-white p-5">
            <AlertDialogCancel className="min-h-11 rounded-full border border-[var(--gray)] bg-white px-5 text-[var(--ink)] hover:bg-[var(--gray-soft)]">Keep my draft</AlertDialogCancel>
            <AlertDialogAction onClick={dialogKind === 'sample' ? loadSample : clearDraft} className="min-h-11 rounded-full bg-[var(--blue)] px-5 text-white hover:bg-[var(--blue-dark)]">{dialogKind === 'sample' ? 'Load example' : 'Clear draft'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function Field({ htmlFor, label, hint, error, children }: { htmlFor: string; label: string; hint?: string; error?: boolean; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="block text-xl leading-6 text-[var(--blue)]">{label}</label>{hint ? <p className="mb-3 mt-1.5 max-w-[62ch] text-sm leading-5 text-[var(--muted)]">{hint}</p> : <span className="block h-3" />}{children}{error && <p className="mt-2 text-sm leading-5 text-[var(--error)]">Add an answer to continue.</p>}</div>;
}

function ReviewPanel({ completed, progress, onEdit, onCopy, onDownload }: { completed: boolean[]; progress: number; onEdit: (index: number) => void; onCopy: () => void; onDownload: () => void }) {
  const missing = completed.map((done, index) => ({ done, index })).filter(({ done }) => !done);
  return <div>
    <p className="text-[13px] text-[var(--muted)]">Review</p>
    <h1 className="mt-1 text-[clamp(2.2rem,4vw,3.5rem)] leading-[0.98] tracking-[-0.045em]">Your creative process, made visible.</h1>
    <p className="mt-5 max-w-[58ch] text-base leading-7 text-[var(--muted)]">Read the complete passport on the right. Tighten anything that does not clearly show your intent, judgment, verification, or authorship.</p>

    <div className={`mt-9 rounded-[24px] border p-6 ${missing.length ? 'border-[var(--gray)]' : 'border-[var(--lime)] bg-[var(--lime-wash)]'}`}>
      {missing.length ? <>
        <h2 className="text-xl">{missing.length} {missing.length === 1 ? 'section needs' : 'sections need'} attention</h2>
        <div className="mt-4 flex flex-wrap gap-2">{missing.map(({ index }) => <button type="button" key={steps[index].label} onClick={() => onEdit(index)} className="min-h-11 rounded-full border border-[var(--gray)] px-4 text-sm text-[var(--blue)] transition hover:border-[var(--blue)]">Edit {steps[index].label.toLowerCase()}</button>)}</div>
      </> : <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--lime)] text-[var(--blue)]"><Check size={17} /></span><div><h2 className="text-xl">All five sections are complete</h2><p className="mt-1 text-sm leading-5 text-[var(--muted)]">Your passport is ready to copy or download.</p></div></div>}
    </div>

    <div className="mt-8 flex flex-wrap items-center gap-3">
      <button type="button" onClick={onCopy} disabled={progress === 0} className="flex min-h-12 items-center gap-2 rounded-full bg-[var(--blue)] px-6 text-base text-white transition hover:bg-[var(--blue-dark)] disabled:cursor-not-allowed disabled:opacity-40"><Clipboard size={17} />Copy passport</button>
      <button type="button" onClick={onDownload} disabled={progress === 0} className="flex min-h-12 items-center gap-2 rounded-full border border-[var(--gray)] px-6 text-base text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-40"><Download size={17} />Download Markdown</button>
    </div>
    <button type="button" onClick={() => onEdit(0)} className="mt-8 min-h-11 text-sm text-[var(--muted)] underline decoration-[var(--gray)] underline-offset-4 hover:text-[var(--ink)]">Return to editing</button>
  </div>;
}

function Passport({ trace, completed, activeStep, reviewMode, progress, onCopy, onDownload }: { trace: Trace; completed: boolean[]; activeStep: number; reviewMode: boolean; progress: number; onCopy: () => void; onDownload: () => void }) {
  return <article className="overflow-hidden rounded-[36px] border border-[var(--gray)] bg-white xl:rounded-[44px]">
    <header className="flex min-h-[78px] items-center justify-between gap-4 border-b border-[var(--gray-light)] px-6 py-5">
      <div><p className="text-xl leading-6">{reviewMode ? 'Your passport' : 'Live preview'}</p><p className="mt-1 text-[13px] text-[var(--muted)]">{reviewMode ? 'Complete document' : 'Focused on this section'}</p></div>
      <div className="flex gap-2"><IconButton label="Copy passport" onClick={onCopy} disabled={progress === 0} icon={<Clipboard size={15} />} /><IconButton label="Download passport as Markdown" onClick={onDownload} disabled={progress === 0} icon={<Download size={15} />} /></div>
    </header>
    <div className="px-6 py-8">
      <div className="mb-8">
        <p className="mb-2 text-sm text-[var(--blue)]">Creative process passport</p>
        <h2 className="text-[clamp(1.75rem,3vw,2.3rem)] leading-[1.02] tracking-[-0.04em]">{trace.project || 'Untitled creative work'}</h2>
        <span className="mt-4 inline-block rounded-full border border-[var(--gray)] px-3 py-1.5 text-[13px] text-[var(--muted)]">{trace.discipline}</span>
      </div>
      <div className="border-t border-[var(--ink)]">
        {previewSections.map((section, index) => {
          const visible = reviewMode || completed[index] || activeStep === index;
          if (!visible) return null;
          return <PassportSection key={section.title} number={section.number} title={section.title} text={section.value(trace)} prompt={section.prompt} current={!reviewMode && activeStep === index} />;
        })}
      </div>
      {!reviewMode && progress === 0 && activeStep !== 0 && <p className="py-6 text-sm leading-6 text-[var(--muted)]">Completed sections will collect here as you move through the trace.</p>}
      <footer className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--gray-light)] pt-5 text-[13px] text-[var(--muted)]"><span>Studio Trace · Sylvia Zamora</span><span className="rounded-full bg-[var(--lime)] px-3 py-1 text-[var(--blue)]">{progress}/5 documented</span></footer>
    </div>
  </article>;
}

function PassportSection({ number, title, text, prompt, current }: { number: string; title: string; text: string; prompt: string; current: boolean }) {
  return <section className={`passport-section grid grid-cols-[34px_1fr] gap-x-3 gap-y-2 border-b py-5 transition ${current ? 'border-[var(--blue)]' : 'border-[var(--gray-light)]'}`}>
    <span className="text-[13px] text-[var(--blue)]">{number}</span>
    <div><h3 className="text-sm leading-5 text-[var(--blue)]">{title}</h3><p className={`mt-2 whitespace-pre-line text-sm leading-6 ${text ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{text || prompt}</p></div>
  </section>;
}

function IconButton({ label, icon, onClick, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid size-10 place-items-center rounded-full border border-[var(--gray-light)] bg-white text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-35">{icon}</button>;
}
