import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLoop, type LoopDeps } from "../src/loop.js";
import type { KaneOutcome, KaneResult, RunKane } from "../src/kane.js";
import type { ClaudeCall, RunClaude } from "../src/claude.js";

const k = (outcome: KaneOutcome, credits = 10): KaneResult => ({
  outcome,
  summary: `summary ${outcome}`,
  reason: `reason ${outcome}`,
  oneLiner: `one ${outcome}`,
  finalState: {},
  credits,
  durationS: 30,
});

/** Kane fake: returns scripted outcomes in order; records the objectives it was given. */
function fakeKane(script: KaneOutcome[]) {
  const calls: string[] = [];
  const kane: RunKane = async ({ objective }) => {
    calls.push(objective);
    const next = script.shift();
    if (!next) throw new Error(`unexpected extra kane call: ${objective}`);
    return k(next);
  };
  return { kane, calls };
}

/** Claude fake: objective calls get "OBJ n", fix calls report a changed file. */
function fakeClaude(onFix?: (c: ClaudeCall) => void) {
  const calls: ClaudeCall[] = [];
  let n = 0;
  const claude: RunClaude = async (c) => {
    calls.push(c);
    if (c.editMode) {
      onFix?.(c);
      return { text: '{"changed":["src/coupons.ts"],"explanation":"compare dates correctly"}' };
    }
    n++;
    return { text: `{"objective":"OBJ ${n}","rationale":"r"}` };
  };
  return { claude, calls };
}

function deps(over: Partial<LoopDeps>): LoopDeps {
  const cwd = mkdtempSync(join(tmpdir(), "rf-loop-"));
  return { kane: fakeKane([]).kane, claude: fakeClaude().claude, cwd, url: "http://localhost:5173", savedTests: [], log: () => {}, ...over };
}

describe("runLoop", () => {
  it("fail → fix → pass is verified, re-running the identical frozen objective", async () => {
    const K = fakeKane(["failed", "passed"]);
    const C = fakeClaude();
    const r = await runLoop("bug", deps({ kane: K.kane, claude: C.claude }));
    expect(r.status).toBe("verified");
    expect(K.calls).toEqual(["OBJ 1", "OBJ 1"]);
    expect(r.objective).toBe("OBJ 1");
    expect(r.attempts.map((a) => [a.phase, a.kane.outcome])).toEqual([
      ["reproduce", "failed"],
      ["verify", "passed"],
    ]);
    expect(r.attempts[1].fixExplanation).toBe("compare dates correctly");
    expect(r.changedFiles).toEqual(["src/coupons.ts"]);
    expect(r.credits).toBe(20);
  });

  it("an objective that passes 3 times is not_reproduced and never edits code", async () => {
    const K = fakeKane(["passed", "passed", "passed"]);
    const C = fakeClaude();
    const r = await runLoop("bug", deps({ kane: K.kane, claude: C.claude }));
    expect(r.status).toBe("not_reproduced");
    expect(K.calls).toEqual(["OBJ 1", "OBJ 2", "OBJ 3"]);
    expect(C.calls.some((c) => c.editMode)).toBe(false);
    expect(C.calls[1].prompt).toContain("OBJ 1"); // retry prompt carries the previous objective
  });

  it("infra errors twice while reproducing stops with infra_error and no fix", async () => {
    const K = fakeKane(["infra_error", "infra_error"]);
    const C = fakeClaude();
    const r = await runLoop("bug", deps({ kane: K.kane, claude: C.claude }));
    expect(r.status).toBe("infra_error");
    expect(C.calls.some((c) => c.editMode)).toBe(false);
  });

  it("an infra error once while reproducing is retried with the same objective", async () => {
    const K = fakeKane(["infra_error", "failed", "passed"]);
    const r = await runLoop("bug", deps({ kane: K.kane, claude: fakeClaude().claude }));
    expect(r.status).toBe("verified");
    expect(K.calls).toEqual(["OBJ 1", "OBJ 1", "OBJ 1"]);
  });

  it("stops as not_verified after exactly 3 fix attempts", async () => {
    const K = fakeKane(["failed", "failed", "failed", "failed"]);
    const C = fakeClaude();
    const r = await runLoop("bug", deps({ kane: K.kane, claude: C.claude }));
    expect(r.status).toBe("not_verified");
    expect(C.calls.filter((c) => c.editMode)).toHaveLength(3);
    expect(C.calls.filter((c) => c.editMode)[2].prompt).toContain("attempt 3 of 3");
  });

  it("an infra error during verify is retried without using up a fix attempt", async () => {
    const K = fakeKane(["failed", "infra_error", "passed"]);
    const C = fakeClaude();
    const r = await runLoop("bug", deps({ kane: K.kane, claude: C.claude }));
    expect(r.status).toBe("verified");
    expect(C.calls.filter((c) => c.editMode)).toHaveLength(1);
  });

  it("a saved test broken by the fix goes back to the fixer, then all green is verified", async () => {
    const K = fakeKane(["failed", "passed", "failed", "passed", "passed"]);
    const C = fakeClaude();
    const r = await runLoop(
      "bug",
      deps({ kane: K.kane, claude: C.claude, savedTests: [{ name: "search-case", objective: "SAVED search" }] }),
    );
    expect(r.status).toBe("verified");
    expect(K.calls).toEqual(["OBJ 1", "OBJ 1", "SAVED search", "OBJ 1", "SAVED search"]);
    const fixes = C.calls.filter((c) => c.editMode);
    expect(fixes).toHaveLength(2);
    expect(fixes[1].prompt).toContain("SAVED search");
    expect(fixes[1].prompt).toContain("search-case");
  });

  it("a saved test identical to the new objective is not run twice", async () => {
    const K = fakeKane(["failed", "passed"]);
    const r = await runLoop("bug", deps({ kane: K.kane, claude: fakeClaude().claude, savedTests: [{ name: "same", objective: "OBJ 1" }] }));
    expect(r.status).toBe("verified");
    expect(K.calls).toHaveLength(2);
  });

  it("a fix that touches .repro/ is tampered and stops immediately", async () => {
    const d = deps({});
    mkdirSync(join(d.cwd, ".repro", "tests"), { recursive: true });
    writeFileSync(join(d.cwd, ".repro", "tests", "x.md"), "original");
    const K = fakeKane(["failed"]);
    const C = fakeClaude(() => writeFileSync(join(d.cwd, ".repro", "tests", "x.md"), "weakened"));
    const r = await runLoop("bug", { ...d, kane: K.kane, claude: C.claude });
    expect(r.status).toBe("tampered");
    expect(K.calls).toHaveLength(1);
  });

  it("fix calls are edit-mode with .repro writes disallowed; objective calls are read-only", async () => {
    const K = fakeKane(["failed", "passed"]);
    const C = fakeClaude();
    await runLoop("bug", deps({ kane: K.kane, claude: C.claude, model: "opus" }));
    const [obj, fix] = C.calls;
    expect(obj.editMode).toBeFalsy();
    expect(obj.allowedTools).toEqual(["Read", "Glob", "Grep"]);
    expect(fix.editMode).toBe(true);
    expect(fix.disallowedTools).toEqual(["Edit(.repro/**)", "Write(.repro/**)"]);
    expect(fix.model).toBe("opus");
  });
});
