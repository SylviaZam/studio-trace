import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interviewGuide, microExamples, renderRecord } from './trace-record.ts';

test('interview returns questions, rejects unsupported fields and does not mutate inputs', () => {
  for (const section of Object.keys(microExamples)) {
    const result = interviewGuide(section);
    assert.equal(result.section, section);
    assert.ok(result.question.endsWith('?') || result.question.includes('?'));
    assert.match(result.instruction, /Do not invent, draft, or insert answers/);
  }
  for (const input of [null, {}, 'project', '__proto__', 'constructor']) assert.throws(() => interviewGuide(input));
});

test('export preserves judgment paragraphs and includes citable context and limitations', () => {
  const trace = { project: 'Map', discipline: 'Design', creator: 'Test Creator', workUrl: 'https://example.com/map', workVersion: '2', accepted: 'Short labels.\nSecond thought.', rejected: 'Chat onboarding.', verified: 'Map checked; accessibility unconfirmed.' };
  const result = renderRecord(trace, '2026-09-09T12:00:00.000Z');
  for (const value of Object.values(trace)) assert.ok(result.includes(value));
  assert.match(result, /2026-09-09T12:00:00.000Z/);
  assert.match(result, /not an independently verified credential/);
  assert.match(result, /Format version:\*\* 2/);
  assert.match(result, /## Human judgment\n\nAccepted or adapted: Short labels.\nSecond thought.\n\nRejected: Chat onboarding./);
  assert.doesNotMatch(result, /ILLUSTRATIVE EXAMPLE/);
});

test('examples remain identified on export and incomplete metadata is explicit', () => {
  const result = renderRecord({ example: 'yes' }, '2026-09-09T12:00:00.000Z');
  assert.match(result, /ILLUSTRATIVE EXAMPLE/);
  assert.match(result, /Creator \(self-declared\):\*\* Not recorded/);
});
