import type { LoopResult, LoopStatus } from "./loop.js";

export const STATUS_LABEL: Record<LoopStatus, string> = {
  verified: "🟢 Verified — reproduced, fixed, re-tested green",
  not_reproduced: "⚪ Not reproduced — no code changed",
  not_verified: "🔴 Not verified — fix attempts ran out",
  infra_error: "⚠️ Kane infrastructure error",
  tampered: "⛔ Aborted — fixer touched saved tests",
};

const ICON = { passed: "🟢 pass", failed: "🔴 fail", infra_error: "⚠️ error" } as const;
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderReport(r: LoopResult, diff: string): string {
  const rows = r.attempts.map((a, i) => {
    const link = a.kane.testUrl ? `[Kane run](${a.kane.testUrl})` : "—";
    const what = a.testName ? `${a.phase} (${a.testName})` : a.phase;
    return `| ${i + 1} | ${what} | ${ICON[a.kane.outcome]} | ${cell(a.kane.oneLiner || a.kane.reason)} | ${cell(a.fixExplanation ?? "")} | ${link} |`;
  });
  return [
    `# repro-fix report`,
    ``,
    `**Status:** ${STATUS_LABEL[r.status]}`,
    ``,
    `${r.message}`,
    ``,
    `## Bug report`,
    ``,
    r.bug
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n"),
    ``,
    `## Frozen Kane test`,
    ``,
    r.objective ? "```text\n" + r.objective + "\n```" : "_none_",
    ``,
    `## Runs`,
    ``,
    `| # | Phase | Result | What Kane saw | Fix applied before this run | Evidence |`,
    `|---|---|---|---|---|---|`,
    ...rows,
    ``,
    `## Code change`,
    ``,
    r.changedFiles.length ? `Files: ${r.changedFiles.map((f) => "`" + f + "`").join(", ")}` : "No files changed.",
    ``,
    diff.trim() ? "```diff\n" + diff.trim() + "\n```" : "",
    ``,
    `---`,
    `Kane credits used: **${Math.round(r.credits * 10) / 10}** · Kane runs: ${r.attempts.length}`,
    ``,
  ].join("\n");
}
