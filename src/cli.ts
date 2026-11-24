import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ensureAppUp } from "./app.js";
import { runClaude } from "./claude.js";
import { commitFix, gitDiff, isCleanRepo } from "./git.js";
import { runKane } from "./kane.js";
import { runLoop } from "./loop.js";
import { renderReport, STATUS_LABEL } from "./report.js";
import { loadSavedTests, saveTest, slugify, writeReport } from "./store.js";

export interface Args {
  cmd: "fix" | "test" | "help";
  bug?: string;
  issue?: string;
  url?: string;
  model?: string;
  commit: boolean;
}

export function parseArgs(argv: string[]): Args {
  const a: Args = { cmd: "fix", commit: true };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--url") a.url = argv[++i];
    else if (v === "--model") a.model = argv[++i];
    else if (v === "--issue") a.issue = argv[++i];
    else if (v === "--no-commit") a.commit = false;
    else if (v === "-h" || v === "--help") a.cmd = "help";
    else rest.push(v);
  }
  if (a.cmd === "help") return a;
  if (rest[0] === "test" && rest.length === 1) a.cmd = "test";
  else if (rest.length) a.bug = rest.join(" ");
  if (a.cmd === "fix" && !a.bug && !a.issue) a.cmd = "help";
  return a;
}

const HELP = `repro-fix — prove the bug in a real browser before the agent may fix it.

Usage:
  repro-fix "<bug report>"         reproduce → fix → verify with Kane CLI + Claude Code
  repro-fix --issue bug.md          read the bug report from a file
  repro-fix test                    re-run every saved test in .repro/tests

Options:
  --url <url>       app URL (default: "url" in repro.config.json)
  --model <alias>   Claude model for the agent (default: sonnet)
  --no-commit       don't commit the verified fix on a repro-fix/<slug> branch

Needs: Kane CLI (kane-cli login --oauth) and Claude Code (logged in).`;

const ICONS: Record<string, string> = { think: "🧠", kane: "🧪", red: "🔴", green: "🟢", fix: "🔧", warn: "⚪", infra: "⚠️ " };
const log = (event: string, detail = "") => console.log(`${ICONS[event] ?? "•"} ${detail}`);

function loadConfig(cwd: string): { url?: string; start?: string } {
  const p = join(cwd, "repro.config.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
}

async function fix(a: Args, cwd: string): Promise<number> {
  const cfg = loadConfig(cwd);
  const url = a.url ?? cfg.url;
  if (!url) throw new Error('No app URL. Pass --url or add {"url": "..."} to repro.config.json.');
  const bug = a.bug ?? readFileSync(a.issue!, "utf8").trim();
  const slug = slugify(bug.split("\n")[0]);
  const wasClean = isCleanRepo(cwd);
  const app = await ensureAppUp(url, cfg.start);
  try {
    console.log(`\n🐞 ${bug.split("\n")[0]}\n🌐 ${url}\n`);
    const result = await runLoop(bug, { kane: runKane, claude: runClaude, cwd, url, savedTests: loadSavedTests(cwd), log, model: a.model });
    const diff = gitDiff(cwd);
    if (result.status === "verified" && result.objective) saveTest(cwd, slug, bug, result.objective);
    const report = writeReport(cwd, slug, renderReport(result, diff));
    console.log(`\n${STATUS_LABEL[result.status]}\n${result.message}`);
    if (result.status === "verified" && a.commit) console.log(commitFix(cwd, slug, `fix: ${bug.split("\n")[0]}\n\nVerified by repro-fix with Kane CLI.`, wasClean).note);
    console.log(`📄 Report: ${relative(cwd, report)}  ·  Kane credits: ${Math.round(result.credits * 10) / 10}\n`);
    return result.status === "verified" ? 0 : 1;
  } finally {
    app.stop();
  }
}

async function test(a: Args, cwd: string): Promise<number> {
  const cfg = loadConfig(cwd);
  const url = a.url ?? cfg.url;
  if (!url) throw new Error('No app URL. Pass --url or add {"url": "..."} to repro.config.json.');
  const tests = loadSavedTests(cwd);
  if (!tests.length) {
    console.log("No saved tests in .repro/tests yet. Run repro-fix \"<bug>\" first.");
    return 0;
  }
  const app = await ensureAppUp(url, cfg.start);
  let failed = 0;
  try {
    for (const t of tests) {
      const r = await runKane({ objective: t.objective, url });
      if (r.outcome !== "passed") failed++;
      console.log(`${r.outcome === "passed" ? "🟢" : r.outcome === "failed" ? "🔴" : "⚠️ "} ${t.name} — ${r.oneLiner || r.reason}`);
    }
  } finally {
    app.stop();
  }
  console.log(`\n${tests.length - failed}/${tests.length} saved tests passed.`);
  return failed ? 1 : 0;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const a = parseArgs(argv);
  if (a.cmd === "help") {
    console.log(HELP);
    return 0;
  }
  try {
    return a.cmd === "test" ? await test(a, process.cwd()) : await fix(a, process.cwd());
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    return 2;
  }
}
