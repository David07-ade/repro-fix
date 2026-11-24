// Dev smoke test: one real claude -p call. Usage: npx tsx scripts/smoke-claude.ts
import { runClaude, extractJson } from "../src/claude.js";
const r = await runClaude({ prompt: "Reply with only this JSON: {\"ok\":true}", cwd: process.cwd(), allowedTools: ["Read"], model: "haiku" });
console.log(extractJson(r.text), r.costUsd);
