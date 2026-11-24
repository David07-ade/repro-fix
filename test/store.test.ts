import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { slugify, saveTest, loadSavedTests, writeReport } from "../src/store.js";
import { renderReport } from "../src/report.js";
import { commitFix, gitDiff, isCleanRepo } from "../src/git.js";
import type { LoopResult } from "../src/loop.js";

const tmp = () => mkdtempSync(join(tmpdir(), "rf-store-"));

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Expired coupon FALL10 accepted!")).toBe("expired-coupon-fall10-accepted");
  });
  it("caps at 50 chars without a trailing dash", () => {
    const s = slugify("a ".repeat(40) + "end");
    expect(s.length).toBeLessThanOrEqual(50);
    expect(s.endsWith("-")).toBe(false);
  });
  it("cuts long slugs at a word boundary, not mid-word", () => {
    expect(slugify("Expired coupon FALL10 is still accepted at checkout — it should be rejected")).toBe(
      "expired-coupon-fall10-is-still-accepted-at",
    );
  });
  it("falls back for symbols-only input", () => {
    expect(slugify("!!!")).toBe("bug");
  });
});

describe("saved tests", () => {
  it("round-trips an objective, including quotes and newlines", () => {
    const d = tmp();
    const objective = "Type 'FALL10' in the coupon field,\nclick \"Apply\" and verify 'Coupon expired' shows";
    const p = saveTest(d, "expired-coupon", "Expired coupon accepted", objective);
    expect(existsSync(p)).toBe(true);
    expect(loadSavedTests(d)).toEqual([{ name: "expired-coupon", objective }]);
  });
  it("returns [] when there is no .repro/tests", () => {
    expect(loadSavedTests(tmp())).toEqual([]);
  });
});

const result: LoopResult = {
  status: "verified",
  bug: "Expired coupon accepted",
  objective: "Apply FALL10 and verify 'Coupon expired'",
  credits: 31.5,
  changedFiles: ["src/coupons.ts"],
  message: "ok",
  attempts: [
    { phase: "reproduce", objective: "o", kane: { outcome: "failed", summary: "", reason: "", oneLiner: "FALL10 accepted", finalState: {}, testUrl: "https://tm/red", credits: 15, durationS: 40 } },
    { phase: "verify", objective: "o", fixExplanation: "flip the comparison", kane: { outcome: "passed", summary: "", reason: "", oneLiner: "shows Coupon expired", finalState: {}, testUrl: "https://tm/green", credits: 16.5, durationS: 38 } },
  ],
};

describe("report", () => {
  it("renders status, both Test Manager links, the fix explanation, diff and credits", () => {
    const md = renderReport(result, "-a\n+b");
    expect(md).toContain("🟢 Verified");
    expect(md).toContain("https://tm/red");
    expect(md).toContain("https://tm/green");
    expect(md).toContain("flip the comparison");
    expect(md).toContain("```diff\n-a\n+b");
    expect(md).toContain("31.5");
  });
  it("writes the report under .repro/reports with a timestamped name", () => {
    const d = tmp();
    const p = writeReport(d, "expired-coupon", "# hi");
    expect(p).toMatch(/\.repro[\\/]reports[\\/]\d{8}-\d{4}-expired-coupon\.md$/);
    expect(readFileSync(p, "utf8")).toBe("# hi");
  });
});

function repo() {
  const d = tmp();
  const g = (c: string) => execSync(`git ${c}`, { cwd: d, stdio: "pipe" });
  g("init -q -b main");
  g("config user.email t@example.com");
  g("config user.name t");
  writeFileSync(join(d, "a.txt"), "1");
  g("add -A");
  g("commit -qm init");
  return d;
}

describe("git", () => {
  it("commits the fix on repro-fix/<slug> when the tree was clean", () => {
    const d = repo();
    expect(isCleanRepo(d)).toBe(true);
    writeFileSync(join(d, "a.txt"), "2");
    expect(gitDiff(d)).toContain("+2");
    const r = commitFix(d, "expired-coupon", "fix: expired coupon", true);
    expect(r.committed).toBe(true);
    expect(execSync("git branch --show-current", { cwd: d }).toString().trim()).toBe("repro-fix/expired-coupon");
  });
  it("never commits (or touches files) when the tree was dirty before the run", () => {
    const d = repo();
    writeFileSync(join(d, "a.txt"), "user work");
    expect(isCleanRepo(d)).toBe(false);
    const r = commitFix(d, "x", "fix", false);
    expect(r.committed).toBe(false);
    expect(r.note).toContain("uncommitted");
    expect(readFileSync(join(d, "a.txt"), "utf8")).toBe("user work");
  });
  it("is a no-op outside a git repo", () => {
    const d = tmp();
    expect(isCleanRepo(d)).toBe(false);
    expect(gitDiff(d)).toBe("");
    expect(commitFix(d, "x", "fix", false).committed).toBe(false);
  });
});
