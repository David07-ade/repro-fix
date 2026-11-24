import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface ClaudeCall {
  prompt: string;
  cwd: string;
  allowedTools: string[];
  disallowedTools?: string[];
  editMode?: boolean;
  model?: string;
}

export type RunClaude = (c: ClaudeCall) => Promise<{ text: string; costUsd?: number }>;

export function buildClaudeArgs(c: ClaudeCall): string[] {
  const args = ["-p", "--output-format", "json", "--model", c.model ?? "sonnet", "--allowedTools", c.allowedTools.join(",")];
  if (c.disallowedTools?.length) args.push("--disallowedTools", c.disallowedTools.join(","));
  if (c.editMode) args.push("--permission-mode", "acceptEdits");
  return args;
}

/** Scan from `start` (a '{') to its matching '}', respecting JSON strings. Returns end index or -1. */
function matchBrace(text: string, start: number): number {
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return -1;
}

/** Pull the last top-level JSON object out of an agent's free-text reply. */
export function extractJson<T>(text: string): T {
  let last: unknown;
  let found = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    const end = matchBrace(text, i);
    if (end < 0) continue;
    try {
      last = JSON.parse(text.slice(i, end + 1));
      found = true;
      i = end;
    } catch {
      /* not JSON from here; keep scanning */
    }
  }
  if (!found) throw new Error("No JSON found in agent reply");
  return last as T;
}

export function parseClaudeOutput(stdout: string): { text: string; costUsd?: number } {
  let o: any;
  try {
    o = JSON.parse(stdout.trim());
  } catch {
    throw new Error(`Unexpected output from claude -p: ${stdout.slice(0, 300)}`);
  }
  if (o.is_error) throw new Error(`Claude Code error: ${o.result ?? "unknown"}`);
  return { text: String(o.result ?? ""), costUsd: typeof o.total_cost_usd === "number" ? o.total_cost_usd : undefined };
}

let cachedBin: string | undefined;
/** On Windows, call claude.exe directly instead of the claude.cmd shim so argv isn't re-parsed by cmd. */
export function findClaudeBin(): string {
  if (cachedBin) return cachedBin;
  if (process.env.CLAUDE_BIN) return (cachedBin = process.env.CLAUDE_BIN);
  if (process.platform === "win32") {
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    const exe = join(root, "@anthropic-ai", "claude-code", "bin", "claude.exe");
    if (existsSync(exe)) return (cachedBin = exe);
  }
  return (cachedBin = "claude");
}

export const runClaude: RunClaude = (c) =>
  new Promise((resolve, reject) => {
    const child = spawn(findClaudeBin(), buildClaudeArgs(c), { cwd: c.cwd, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => reject(new Error(`Could not start Claude Code (${e.message}). Is it installed and logged in?`)));
    child.on("close", (code) => {
      try {
        resolve(parseClaudeOutput(out));
      } catch (e) {
        reject(new Error(`${(e as Error).message}${err ? `\nstderr: ${err.slice(-500)}` : ""} (exit ${code})`));
      }
    });
    child.stdin.end(c.prompt);
  });
