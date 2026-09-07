'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, Download, FileText, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

type Trace = { project: string; discipline: string; intent: string; aiUse: string; accepted: string; rejected: string; verified: string; humanDecisions: string };

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
  { label: 'Frame the work', fields: ['project', 'discipline', 'intent'] },
  { label: 'Name the AI role', fields: ['aiUse'] },
  { label: 'Show your judgment', fields: ['accepted', 'rejected'] },
  { label: 'Record verification', fields: ['verified'] },
  { label: 'Claim your authorship', fields: ['humanDecisions'] },
] as const;

const fieldClass = 'w-full rounded-[3px] border border-[var(--line-strong)] bg-white px-4 py-3 text-[15px] leading-6 text-[var(--ink)] outline-none transition focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-soft)] placeholder:text-[var(--muted)]';

export default function Home() {
  const [trace, setTrace] = useState<Trace>(emptyTrace);
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const completed = useMemo(() => steps.map((step) => step.fields.every((field) => trace[field as keyof Trace].trim().length > 0)), [trace]);
  const progress = completed.filter(Boolean).length;
  const set = (field: keyof Trace, value: string) => setTrace((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    const context = (document as Document & {
      modelContext?: {
        registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void>;
      };
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
          project: { type: 'string' },
          discipline: { type: 'string' },
          intent: { type: 'string' },
          aiUse: { type: 'string' },
          accepted: { type: 'string' },
          rejected: { type: 'string' },
          verified: { type: 'string' },
          humanDecisions: { type: 'string' },
        },
        required: [...required],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input: unknown) {
        if (!input || typeof input !== 'object') throw new Error('Passport details must be an object.');
        const candidate = input as Record<string, unknown>;
        if (required.some((field) => typeof candidate[field] !== 'string' || !(candidate[field] as string).trim())) {
          throw new Error('Every passport section must contain the creator’s own account.');
        }
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
    await navigator.clipboard.writeText(disclosure);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadDisclosure = () => {
    const markdown = `# ${trace.project || 'Creative Process Passport'}\n\n**Discipline:** ${trace.discipline}\n\n${disclosure.split('\n\n').slice(1).map((section) => { const [heading, ...body] = section.split('\n'); return `## ${heading}\n\n${body.join('\n')}`; }).join('\n\n')}\n`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'creative-process-passport.md';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-5 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center bg-[var(--ink)] text-white"><FileText size={18} strokeWidth={1.8} /></div>
            <div><p className="text-[17px] font-bold tracking-[-0.03em]">StudioTrace</p><p className="text-xs text-[var(--muted)]">Creative process, made visible</p></div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-[var(--muted)] sm:flex"><ShieldCheck size={16} /><span>Your work stays in this browser.</span></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[220px_minmax(420px,1fr)_minmax(360px,0.9fr)]">
        <aside className="border-b border-[var(--line)] bg-white px-5 py-6 lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="mb-7 flex items-end justify-between lg:block">
            <div><p className="text-sm font-semibold">Your trace</p><p className="mt-1 text-sm text-[var(--muted)]">{progress} of 5 sections complete</p></div>
            <div className="mt-4 h-1.5 w-24 overflow-hidden bg-[var(--blue-soft)] lg:w-full"><div className="h-full bg-[var(--blue)] transition-[width] duration-300" style={{ width: `${progress * 20}%` }} /></div>
          </div>
          <nav aria-label="Passport sections" className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1">
            {steps.map((step, index) => (
              <button key={step.label} type="button" onClick={() => setActiveStep(index)} className={`group flex shrink-0 items-center gap-3 rounded-[3px] px-3 py-2.5 text-left text-sm transition lg:w-full ${activeStep === index ? 'bg-[var(--blue-soft)] font-semibold text-[var(--blue-deep)]' : 'text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]'}`}>
                <span className={`grid size-6 shrink-0 place-items-center border text-xs ${completed[index] ? 'border-[var(--mint-dark)] bg-[var(--mint)] text-[var(--ink)]' : activeStep === index ? 'border-[var(--blue)] bg-white text-[var(--blue)]' : 'border-[var(--line-strong)] bg-white'}`}>{completed[index] ? <Check size={14} strokeWidth={2.5} /> : index + 1}</span>
                <span>{step.label}</span>
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => { setTrace(sampleTrace); setActiveStep(0); }} className="mt-7 flex items-center gap-2 text-sm font-semibold text-[var(--blue)] hover:underline hover:underline-offset-4"><Sparkles size={15} />Try a completed example</button>
        </aside>

        <section className="border-b border-[var(--line)] px-5 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-12">
          <div className="mx-auto max-w-[680px]">
            <div className="mb-9 flex items-start justify-between gap-5">
              <div><p className="mb-2 text-sm font-semibold text-[var(--blue)]">Section {activeStep + 1}</p><h1 className="font-editorial text-[clamp(2rem,4vw,3.35rem)] leading-[0.98] tracking-[-0.04em]">{steps[activeStep].label}</h1></div>
              <button type="button" aria-label="Clear all fields" onClick={() => setTrace(emptyTrace)} className="mt-1 grid size-10 place-items-center border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"><RotateCcw size={16} /></button>
            </div>

            {activeStep === 0 && <div className="space-y-6">
              <Field label="Project title" hint="Use the name your audience will recognize."><input className={fieldClass} value={trace.project} onChange={(e) => set('project', e.target.value)} placeholder="e.g. Transit wayfinding prototype" /></Field>
              <Field label="Creative discipline"><select className={fieldClass} value={trace.discipline} onChange={(e) => set('discipline', e.target.value)}>{['Interaction design', 'Graphic design', 'Fashion', 'Illustration', 'Film', 'Photography', 'Animation', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="What did you set out to make or understand?" hint="Describe your intent before AI entered the process."><textarea className={`${fieldClass} min-h-32 resize-y`} value={trace.intent} onChange={(e) => set('intent', e.target.value)} placeholder="I wanted to…" /></Field>
            </div>}
            {activeStep === 1 && <Field label="How did AI participate?" hint="Name the tool, the request, and the stage of your process."><textarea className={`${fieldClass} min-h-52 resize-y`} value={trace.aiUse} onChange={(e) => set('aiUse', e.target.value)} placeholder="I asked Claude to…" /></Field>}
            {activeStep === 2 && <div className="space-y-7">
              <Field label="What did you accept or adapt?" hint="Explain why it improved the work."><textarea className={`${fieldClass} min-h-36 resize-y`} value={trace.accepted} onChange={(e) => set('accepted', e.target.value)} placeholder="I kept the suggestion to… because…" /></Field>
              <Field label="What did you reject?" hint="Rejection is evidence of judgment, not a failed interaction."><textarea className={`${fieldClass} min-h-36 resize-y`} value={trace.rejected} onChange={(e) => set('rejected', e.target.value)} placeholder="I chose not to… because…" /></Field>
            </div>}
            {activeStep === 3 && <Field label="What did you verify?" hint="Include sources, comparisons, or checks you performed yourself."><textarea className={`${fieldClass} min-h-52 resize-y`} value={trace.verified} onChange={(e) => set('verified', e.target.value)} placeholder="I checked… against…" /></Field>}
            {activeStep === 4 && <Field label="Which decisions remained yours?" hint="Be concrete about interpretation, direction, and final choices."><textarea className={`${fieldClass} min-h-52 resize-y`} value={trace.humanDecisions} onChange={(e) => set('humanDecisions', e.target.value)} placeholder="I remained responsible for…" /></Field>}

            <div className="mt-10 flex items-center justify-between border-t border-[var(--line)] pt-5">
              <button type="button" disabled={activeStep === 0} onClick={() => setActiveStep((step) => step - 1)} className="text-sm font-semibold disabled:invisible">Previous</button>
              {activeStep < steps.length - 1 ? <button type="button" onClick={() => setActiveStep((step) => step + 1)} className="bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--blue-deep)]">Continue</button> : <button type="button" onClick={copyDisclosure} className="bg-[var(--blue)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--blue-deep)]">Copy passport</button>}
            </div>
          </div>
        </section>

        <aside className="bg-[var(--preview)] px-5 py-8 sm:px-8 lg:min-h-[calc(100vh-65px)] lg:px-9 lg:py-12">
          <div className="mx-auto max-w-[560px] lg:sticky lg:top-8">
            <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">Live passport</p><div className="flex gap-2"><IconButton label={copied ? 'Copied' : 'Copy'} onClick={copyDisclosure} icon={copied ? <Check size={15} /> : <Clipboard size={15} />} /><IconButton label="Download" onClick={downloadDisclosure} icon={<Download size={15} />} /></div></div>
            <article className="passport-sheet relative overflow-hidden bg-white px-6 py-7 sm:px-8 sm:py-9">
              <div className="passport-stripe" aria-hidden="true" />
              <div className="mb-8 flex items-start justify-between gap-4 border-b border-[var(--ink)] pb-5"><div><p className="mb-1 text-xs font-bold text-[var(--blue)]">CREATIVE PROCESS PASSPORT</p><h2 className="font-editorial text-3xl leading-none tracking-[-0.035em]">{trace.project || 'Untitled creative work'}</h2></div><span className="border border-[var(--ink)] px-2 py-1 text-[11px] font-semibold">{trace.discipline}</span></div>
              <PassportSection title="Creative intent" text={trace.intent} />
              <PassportSection title="Role of AI" text={trace.aiUse} />
              <PassportSection title="Human judgment" text={trace.accepted || trace.rejected ? `Accepted or adapted: ${trace.accepted || '—'}\n\nRejected: ${trace.rejected || '—'}` : ''} />
              <PassportSection title="Verification" text={trace.verified} />
              <PassportSection title="Authorship" text={trace.humanDecisions} />
              <footer className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-4 text-[11px] text-[var(--muted)]"><span>StudioTrace · Sylvia Zamora</span><span>{progress}/5 documented</span></footer>
            </article>
            <p className="mt-4 flex gap-2 text-xs leading-5 text-[var(--muted)]"><ShieldCheck className="mt-0.5 shrink-0" size={14} />StudioTrace does not save or transmit your entries. Avoid including confidential client or school work.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[15px] font-bold">{label}</span>{hint && <span className="mb-3 block max-w-[58ch] text-sm leading-5 text-[var(--muted)]">{hint}</span>}{children}</label>;
}

function PassportSection({ title, text }: { title: string; text: string }) {
  return <section className="passport-section grid grid-cols-[7.5rem_1fr] gap-4 border-b border-[var(--line)] py-4 last:border-b-0"><h3 className="text-xs font-bold text-[var(--blue-deep)]">{title}</h3><p className={`whitespace-pre-line text-[13px] leading-5 ${text ? 'text-[var(--ink)]' : 'italic text-[var(--muted)]'}`}>{text || 'Add this part of your process.'}</p></section>;
}

function IconButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={label} className="flex items-center gap-1.5 border border-[var(--line-strong)] bg-white px-2.5 py-2 text-xs font-semibold hover:border-[var(--ink)]">{icon}<span className="hidden sm:inline">{label}</span></button>;
}
