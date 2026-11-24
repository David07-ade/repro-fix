import { spawnSync } from "node:child_process";

function git(cwd: string, args: string[]) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  return { ok: r.status === 0, out: (r.stdout ?? "").toString() };
}

const isRepo = (cwd: string) => git(cwd, ["rev-parse", "--is-inside-work-tree"]).out.trim() === "true";

/** True only inside a git repo with no uncommitted changes. Call before the loop starts. */
export function isCleanRepo(cwd: string): boolean {
  if (!isRepo(cwd)) return false;
  const s = git(cwd, ["status", "--porcelain", "--", ".", ":(exclude).repro"]);
  return s.ok && s.out.trim() === "";
}

export function gitDiff(cwd: string): string {
  if (!isRepo(cwd)) return "";
  return git(cwd, ["diff", "HEAD", "--", ".", ":(exclude).repro"]).out;
}

/** Commit the fix on repro-fix/<slug>. Never touches the tree if it wasn't clean before the run. */
export function commitFix(cwd: string, slug: string, msg: string, wasClean: boolean): { committed: boolean; note: string } {
  if (!isRepo(cwd)) return { committed: false, note: "Not a git repo — changes left in the working tree." };
  if (!wasClean) return { committed: false, note: "Your tree had uncommitted changes before the run, so nothing was committed." };
  const branch = `repro-fix/${slug}`;
  if (!git(cwd, ["checkout", "-B", branch]).ok) return { committed: false, note: `Could not create branch ${branch}.` };
  git(cwd, ["add", "-A"]);
  const c = git(cwd, ["commit", "-q", "-m", msg]);
  return c.ok ? { committed: true, note: `Committed on branch ${branch} (not pushed).` } : { committed: false, note: "Nothing to commit." };
}
