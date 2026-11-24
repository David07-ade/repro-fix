import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { killTree } from "./proc.js";

export type KaneOutcome = "passed" | "failed" | "infra_error";

export interface KaneResult {
  outcome: KaneOutcome;
  summary: string;
  reason: string;
  oneLiner: string;
  finalState: Record<string, unknown>;
  testUrl?: string;
  credits: number;
  durationS: number;
  raw?: string;
}

export type RunKane = (o: { objective: string; url: string; timeoutS?: number }) => Promise<KaneResult>;

/** Turn kane-cli --agent NDJSON stdout plus its exit code into a result. */
export function parseKaneStream(stdout: string, exitCode: number | null): KaneResult {
  let end: any;
  for (const line of stdout.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const ev = JSON.parse(t);
      if (ev?.type === "run_end") end = ev;
    } catch {
      /* ignore non-JSON lines */
    }
  }
  const tail = stdout.slice(-2000);
  if (!end || (exitCode !== 0 && exitCode !== 1)) {
    return {
      outcome: "infra_error",
      summary: end?.summary ?? "",
      reason: end?.reason ?? `kane-cli exited with code ${exitCode} and no usable run_end`,
      oneLiner: end?.one_liner ?? "",
      finalState: end?.final_state ?? {},
      testUrl: end?.test_url,
      credits: Number(end?.credits_consumed ?? 0),
      durationS: Number(end?.duration ?? 0),
      raw: tail,
    };
  }
  return {
    outcome: end.status === "passed" && exitCode === 0 ? "passed" : "failed",
    summary: end.summary ?? "",
    reason: end.reason ?? "",
    oneLiner: end.one_liner ?? "",
    finalState: end.final_state ?? {},
    testUrl: end.test_url,
    credits: Number(end.credits_consumed ?? 0),
    durationS: Number(end.duration ?? 0),
  };
}

export function buildKaneArgs(o: { objective: string; url: string; timeoutS: number }): string[] {
  return ["run", o.objective, "--url", o.url, "--agent", "--headless", "--timeout", String(o.timeoutS)];
}

let cachedEntry: string | undefined;
/** Locate kane-cli's JS entry so we can run it with node directly (no cmd.exe re-parsing of quotes). */
export function findKaneEntry(): string {
  if (cachedEntry) return cachedEntry;
  const override = process.env.KANE_CLI_ENTRY;
  if (override && existsSync(override)) return (cachedEntry = override);
  const root = execSync("npm root -g", { encoding: "utf8" }).trim();
  const entry = join(root, "@testmuai", "kane-cli", "bin", "kane-cli.cjs");
  if (!existsSync(entry)) {
    throw new Error("kane-cli not found. Install it with: npm install -g @testmuai/kane-cli && kane-cli login --oauth");
  }
  return (cachedEntry = entry);
}

export const runKane: RunKane = ({ objective, url, timeoutS = 180 }) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [findKaneEntry(), ...buildKaneArgs({ objective, url, timeoutS })], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    let done = false;
    const finish = (code: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(killer);
      const r = parseKaneStream(out, code);
      if (r.outcome === "infra_error") r.raw = `${r.raw ?? ""}\n--- stderr ---\n${err.slice(-1500)}`;
      resolve(r);
    };
    const killer = setTimeout(() => {
      killTree(child);
      finish(null);
    }, (timeoutS + 30) * 1000);
    child.on("close", (code) => finish(code));
    // Grandchildren (Chrome) can keep the pipes open after kane-cli exits, so
    // "close" may never fire. Give stdout a moment to drain after "exit", then finish.
    child.on("exit", (code) => setTimeout(() => finish(code), 3000));
    child.on("error", (e) => {
      clearTimeout(killer);
      resolve({ ...parseKaneStream("", null), reason: `failed to start kane-cli: ${e.message}` });
    });
  });
