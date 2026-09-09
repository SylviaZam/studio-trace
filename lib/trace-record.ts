export const microExamples: Record<string, string> = {
  intent: 'I wanted first-time riders to find a transfer without reading the whole map.',
  aiUse: 'I asked Claude to question my hierarchy. It suggested grouping transfers; I evaluated that suggestion myself.',
  accepted: 'I kept shorter transfer labels because they were easier to scan.',
  rejected: 'I rejected a chat-based start because it delayed the route. If you rejected nothing, say so and explain why.',
  verified: 'I compared station names with the agency map dated 8 September. Accessibility details still need checking.',
  humanDecisions: 'I chose the hierarchy and final layout. AI proposed alternatives; I decided which to use.',
};

export function interviewGuide(section: unknown) {
  if (typeof section !== 'string' || !Object.hasOwn(microExamples, section)) throw new Error('Choose a supported reflection field.');
  return {
    section,
    instruction: 'Ask the creator about their actual experience, one question at a time. Do not invent, draft, or insert answers. The creator writes their own account in Studio Trace. Do not request confidential work.',
    question: ({ intent: 'What were you trying to achieve before using AI?', aiUse: 'Which tool did you use, what did you ask, and what did it contribute?', accepted: 'What suggestion did you keep or change, and why?', rejected: 'What did you decline, and why? It is fine if nothing was rejected.', verified: 'What did you check, against which source or test, and what remains uncertain?', humanDecisions: 'Which decisions did you personally make and remain responsible for?' } as Record<string, string>)[section],
  };
}

export function renderRecord(trace: Record<string, string>, exportedAt: string) {
  const value = (key: string) => trace[key]?.trim() || 'Not recorded.';
  const sections = [
    ['Creative intent', value('intent')], ['Role of AI', value('aiUse')],
    ['Human judgment', `Accepted or adapted: ${value('accepted')}\n\nRejected: ${value('rejected')}`],
    ['Verification reported by the creator', value('verified')], ['Authorship', value('humanDecisions')],
  ];
  return `# ${value('project')}\n\nCreative process reflection · Studio Trace\n\nThis is a self-report, not an independently verified credential or proof of authorship.\n\n${trace.example === 'yes' ? '**ILLUSTRATIVE EXAMPLE — not a record of an actual project.**\n\n' : ''}**Creator (self-declared):** ${value('creator')}\n**Discipline:** ${value('discipline')}\n**Work reference:** ${value('workUrl')}\n**Work version:** ${value('workVersion')}\n**Exported at (device clock):** ${exportedAt}\n**Format version:** 2\n\n${sections.map(([heading, body]) => `## ${heading}\n\n${body}`).join('\n\n')}\n\n---\nCreated with Studio Trace, a reflection tool by Sylvia Zamora. Content and identity are self-declared; references and checks are not verified by the app.\n`;
}
