import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}

/** sha256 over sorted relative paths + contents. "" when the directory doesn't exist. */
export function hashDir(dir: string): string {
  if (!existsSync(dir)) return "";
  const files: string[] = [];
  walk(dir, files);
  const h = createHash("sha256");
  for (const f of files.map((f) => relative(dir, f).replace(/\\/g, "/")).sort()) {
    h.update(f).update("\0").update(readFileSync(join(dir, f))).update("\0");
  }
  return h.digest("hex");
}
