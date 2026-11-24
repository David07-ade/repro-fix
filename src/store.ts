import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function slugify(bug: string): string {
  const s = bug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  return s || "bug";
}

const testsDir = (cwd: string) => join(cwd, ".repro", "tests");

/** Saved test format: front-matter with name + JSON-encoded bug, then the objective verbatim. */
export function saveTest(cwd: string, slug: string, bug: string, objective: string): string {
  mkdirSync(testsDir(cwd), { recursive: true });
  const p = join(testsDir(cwd), `${slug}.md`);
  writeFileSync(p, `---\nname: ${slug}\nbug: ${JSON.stringify(bug)}\n---\n${objective}\n`);
  return p;
}

export function loadSavedTests(cwd: string): { name: string; objective: string }[] {
  const dir = testsDir(cwd);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const text = readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n");
      const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      const name = m?.[1].match(/^name:\s*(.+)$/m)?.[1].trim() ?? f.replace(/\.md$/, "");
      const objective = (m ? m[2] : text).replace(/\n$/, "");
      return { name, objective };
    })
    .filter((t) => t.objective.trim().length > 0);
}

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function writeReport(cwd: string, slug: string, md: string): string {
  const dir = join(cwd, ".repro", "reports");
  mkdirSync(dir, { recursive: true });
  const p = join(dir, `${stamp()}-${slug}.md`);
  writeFileSync(p, md);
  return p;
}
