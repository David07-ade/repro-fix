import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashDir } from "../src/guard.js";
import { fixPrompt, objectivePrompt } from "../src/prompts.js";
import type { KaneResult } from "../src/kane.js";

function tmp() {
  const d = mkdtempSync(join(tmpdir(), "rf-guard-"));
  mkdirSync(join(d, "tests"), { recursive: true });
  writeFileSync(join(d, "tests", "a.md"), "one");
  return d;
}

describe("hashDir", () => {
  it("is stable for unchanged content", () => {
    const d = tmp();
    expect(hashDir(d)).toBe(hashDir(d));
    expect(hashDir(d)).not.toBe("");
  });
  it("changes when a file's content changes", () => {
    const d = tmp();
    const before = hashDir(d);
    writeFileSync(join(d, "tests", "a.md"), "two");
    expect(hashDir(d)).not.toBe(before);
  });
  it("changes when a file is added", () => {
    const d = tmp();
    const before = hashDir(d);
    writeFileSync(join(d, "b.md"), "x");
    expect(hashDir(d)).not.toBe(before);
  });
  it('returns "" for a missing directory', () => {
    expect(hashDir(join(tmpdir(), "definitely-missing-rf-dir"))).toBe("");
  });
});

const failure: KaneResult = {
  outcome: "failed",
  summary: "Coupon was applied",
  reason: "Assertion failed: expected error 'Coupon expired'",
  oneLiner: "FALL10 accepted",
  finalState: { total: "$27.00" },
  credits: 15,
  durationS: 40,
};

describe("prompts", () => {
  it("fixPrompt contains the frozen objective verbatim and Kane's reason and final state", () => {
    const objective = "Type 'FALL10' in the coupon field, click Apply, and verify the text 'Coupon expired' is shown";
    const p = fixPrompt("Expired coupon accepted", objective, failure, 2);
    expect(p).toContain(objective);
    expect(p).toContain(failure.reason);
    expect(p).toContain("$27.00");
    expect(p).toContain(".repro/");
    expect(p).toContain("attempt 2 of 3");
  });
  it("objectivePrompt includes the bug, url and, on retry, why the last objective passed", () => {
    const p = objectivePrompt("Search is case-sensitive", "http://localhost:5173", {
      objective: "old objective",
      kane: { ...failure, outcome: "passed", summary: "Mug was shown" },
    });
    expect(p).toContain("Search is case-sensitive");
    expect(p).toContain("http://localhost:5173");
    expect(p).toContain("old objective");
    expect(p).toContain("Mug was shown");
    expect(p).toContain('"objective"');
  });
});
