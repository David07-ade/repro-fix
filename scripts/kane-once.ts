// Dev helper: run one Kane objective. Usage: npx tsx scripts/kane-once.ts "<objective>" [url]
import { runKane } from "../src/kane.js";
const r = await runKane({ objective: process.argv[2], url: process.argv[3] ?? "http://localhost:5173", timeoutS: 150 });
console.log(JSON.stringify({ outcome: r.outcome, oneLiner: r.oneLiner, reason: r.reason, summary: r.summary, credits: r.credits }, null, 1));
