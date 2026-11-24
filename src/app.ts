import { spawn } from "node:child_process";
import { killTree } from "./proc.js";

export async function isUp(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** Make sure the target app answers at `url`, starting it with `start` if needed. */
export async function ensureAppUp(url: string, start?: string, waitMs = 60000): Promise<{ started: boolean; stop: () => void }> {
  if (await isUp(url)) return { started: false, stop: () => {} };
  if (!start) throw new Error(`App not reachable at ${url}. Start it or set "start" in repro.config.json.`);
  const child = spawn(start, { shell: true, stdio: "ignore", windowsHide: true });
  const stop = () => killTree(child);
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Start command exited early (code ${child.exitCode}): ${start}`);
    if (await isUp(url, 1500)) return { started: true, stop };
    await new Promise((r) => setTimeout(r, 500));
  }
  stop();
  throw new Error(`App did not come up at ${url} within ${Math.round(waitMs / 1000)}s after: ${start}`);
}
