import { join } from "node:path";
import type { KaneResult, RunKane } from "./kane.js";
import { extractJson, type RunClaude } from "./claude.js";
import { hashDir } from "./guard.js";
import { MAX_FIX_ATTEMPTS, fixPrompt, objectivePrompt } from "./prompts.js";

export const MAX_OBJECTIVE_ATTEMPTS = 3;

export type LoopStatus = "verified" | "not_reproduced" | "not_verified" | "infra_error" | "tampered";

export interface Attempt {
  phase: "reproduce" | "verify" | "regression";
  objective: string;
  testName?: string;
  kane: KaneResult;
  fixExplanation?: string;
}

export interface LoopResult {
  status: LoopStatus;
  bug: string;
  objective?: string;
  attempts: Attempt[];
  credits: number;
  changedFiles: string[];
  message: string;
}

export interface LoopDeps {
  kane: RunKane;
  claude: RunClaude;
  cwd: string;
  url: string;
  savedTests: { name: string; objective: string }[];
  log: (event: string, detail?: string) => void;
  model?: string;
}

const READ_ONLY = ["Read", "Glob", "Grep"];
const EDIT_TOOLS = ["Read", "Glob", "Grep", "Edit", "Write"];
const PROTECT = ["Edit(.repro/**)", "Write(.repro/**)"];

export async function runLoop(bug: string, d: LoopDeps): Promise<LoopResult> {
  const attempts: Attempt[] = [];
  const changed = new Set<string>();
  let credits = 0;
  const result = (status: LoopStatus, message: string, objective?: string): LoopResult => ({
    status,
    bug,
    objective,
    attempts,
    credits,
    changedFiles: [...changed],
    message,
  });

  /** Run Kane once, retrying a single time on infra error. Records every run. */
  const kaneRun = async (phase: Attempt["phase"], objective: string, testName?: string, fixExplanation?: string) => {
    let r: KaneResult | undefined;
    for (let i = 0; i < 2; i++) {
      r = await d.kane({ objective, url: d.url });
      credits += r.credits;
      attempts.push({ phase, objective, testName, kane: r, fixExplanation });
      if (r.outcome !== "infra_error") break;
      d.log("infra", `Kane infrastructure error (${r.reason}) — ${i === 0 ? "retrying once" : "giving up"}`);
    }
    return r!;
  };

  // 1. Reproduce
  let objective: string | undefined;
  let failure: KaneResult | undefined;
  let previous: { objective: string; kane: KaneResult } | undefined;
  for (let i = 0; i < MAX_OBJECTIVE_ATTEMPTS && !failure; i++) {
    d.log("think", i === 0 ? "Writing a Kane test that reproduces the bug" : "Rewriting the test (previous one passed)");
    const reply = await d.claude({ prompt: objectivePrompt(bug, d.url, previous), cwd: d.cwd, allowedTools: READ_ONLY, model: d.model });
    const candidate = extractJson<{ objective: string }>(reply.text).objective;
    d.log("kane", `Running: ${candidate}`);
    const r = await kaneRun("reproduce", candidate);
    if (r.outcome === "infra_error") return result("infra_error", `Kane could not run: ${r.reason}`, candidate);
    if (r.outcome === "failed") {
      objective = candidate;
      failure = r;
      d.log("red", `Reproduced: ${r.oneLiner || r.reason}`);
    } else {
      previous = { objective: candidate, kane: r };
      d.log("warn", `Test passed — bug not reproduced (${r.oneLiner})`);
    }
  }
  if (!objective || !failure) {
    return result("not_reproduced", `Could not reproduce after ${MAX_OBJECTIVE_ATTEMPTS} objectives. No code was changed.`, previous?.objective);
  }

  // 2-4. Fix → verify → regression, with the objective frozen
  const frozen = objective;
  const reproDir = join(d.cwd, ".repro");
  let failingBug = bug;
  let failingObjective = frozen;
  for (let n = 1; n <= MAX_FIX_ATTEMPTS; n++) {
    d.log("fix", `Fix attempt ${n}/${MAX_FIX_ATTEMPTS}`);
    const guard = hashDir(reproDir);
    const reply = await d.claude({
      prompt: fixPrompt(failingBug, failingObjective, failure, n),
      cwd: d.cwd,
      allowedTools: EDIT_TOOLS,
      disallowedTools: PROTECT,
      editMode: true,
      model: d.model,
    });
    let explanation = "";
    try {
      const f = extractJson<{ changed?: string[]; explanation?: string }>(reply.text);
      f.changed?.forEach((c) => changed.add(c));
      explanation = f.explanation ?? "";
    } catch {
      explanation = reply.text.slice(0, 300);
    }
    if (hashDir(reproDir) !== guard) {
      return result("tampered", "The fix step modified .repro/ (saved tests). Run aborted; review the changes.", frozen);
    }
    d.log("kane", "Re-running the frozen test");
    const v = await kaneRun("verify", frozen, undefined, explanation);
    if (v.outcome === "infra_error") return result("infra_error", `Kane could not run: ${v.reason}`, frozen);
    if (v.outcome === "failed") {
      d.log("red", `Still failing: ${v.oneLiner || v.reason}`);
      failure = v;
      failingBug = bug;
      failingObjective = frozen;
      continue;
    }
    d.log("green", "Frozen test passes");

    let broken: { name: string; objective: string; kane: KaneResult } | undefined;
    for (const t of d.savedTests) {
      if (t.objective === frozen) continue;
      d.log("kane", `Regression: ${t.name}`);
      const r = await kaneRun("regression", t.objective, t.name);
      if (r.outcome === "infra_error") return result("infra_error", `Kane could not run: ${r.reason}`, frozen);
      if (r.outcome === "failed") {
        broken = { ...t, kane: r };
        break;
      }
    }
    if (!broken) return result("verified", "Bug reproduced, fixed and verified in a real browser.", frozen);
    d.log("red", `Regression broke: ${broken.name}`);
    failure = broken.kane;
    failingObjective = broken.objective;
    failingBug = `Your fix for this bug:\n${bug}\nbroke the existing saved test "${broken.name}". Make that saved test pass again while keeping the original bug fixed.`;
  }
  return result("not_verified", `The fix was not verified after ${MAX_FIX_ATTEMPTS} attempts. Code changes were left in place for review.`, frozen);
}
