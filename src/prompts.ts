import type { KaneResult } from "./kane.js";

export const MAX_FIX_ATTEMPTS = 3;

function kaneEvidence(k: KaneResult): string {
  return [
    `- outcome: ${k.outcome}`,
    `- one-liner: ${k.oneLiner}`,
    `- summary: ${k.summary}`,
    `- reason: ${k.reason}`,
    `- final page state: ${JSON.stringify(k.finalState)}`,
  ].join("\n");
}

export function objectivePrompt(bug: string, url: string, previous?: { objective: string; kane: KaneResult }): string {
  return `You are writing ONE end-to-end browser test for Kane CLI, an AI test runner that reads a plain-English
objective, drives a real Chrome browser starting at ${url}, and returns pass or fail.

Bug report from a user:
"""
${bug}
"""

Read this project's source code (you are in its root) to learn the real page structure, button labels,
input placeholders, product names and expected messages. Then write an objective that:
1. Lists concrete steps a user would take, using the exact visible labels from the code.
2. Ends with one "verify ..." check describing the CORRECT behaviour, so the test FAILS while the bug
   exists and PASSES once it is fixed.
3. Is short (1-4 sentences), deterministic, and does not depend on dates/time/randomness beyond the bug itself.
4. Does not mention code, selectors, or file names — only what a user sees.
Do NOT modify any files.
${
  previous
    ? `
Your previous objective did NOT reproduce the bug — Kane reported it PASSED:
Objective: ${previous.objective}
Kane evidence:
${kaneEvidence(previous.kane)}
Write a different objective that targets the bug more precisely.
`
    : ""
}
Reply with ONLY a JSON object: {"objective": "<the Kane objective>", "rationale": "<one sentence: why this fails now>"}`;
}

export function fixPrompt(bug: string, objective: string, failure: KaneResult, attempt: number): string {
  return `You are fixing a bug in this project (you are in its root). The bug has been REPRODUCED in a real browser
by Kane CLI using a frozen test. Your job: change the application source so the test passes.

Bug report:
"""
${bug}
"""

Frozen Kane test objective (it will be re-run exactly as written):
"""
${objective}
"""

What Kane saw on the failing run:
${kaneEvidence(failure)}

This is fix attempt ${attempt} of ${MAX_FIX_ATTEMPTS}.

Rules:
- Make the smallest correct fix in the application source. Fix the root cause, not the symptom.
- NEVER create, edit or delete anything under .repro/ (saved tests and reports). Edits there abort the run.
- Do not change visible labels or messages the objective relies on unless they ARE the bug.
- Do not start or restart servers; the dev server reloads on save.
- Keep other behaviour unchanged: other saved tests will be re-run after your fix.

When done, reply with ONLY a JSON object: {"changed": ["<relative file paths you edited>"], "explanation": "<one or two sentences>"}`;
}
