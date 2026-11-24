import { spawnSync, type ChildProcess } from "node:child_process";

/** Kill a process and everything it started (dev servers, kane's bundled runtime, Chrome). */
export function killTree(child: ChildProcess) {
  if (child.exitCode !== null || !child.pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGTERM");
}
