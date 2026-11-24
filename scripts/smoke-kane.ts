// Dev smoke test: one real Kane run through the adapter. Usage: npx tsx scripts/smoke-kane.ts
import { runKane } from "../src/kane.js";
const r = await runKane({ objective: "Verify the page shows a heading containing the word Example", url: "https://example.com", timeoutS: 150 });
console.log(JSON.stringify({ outcome: r.outcome, oneLiner: r.oneLiner, credits: r.credits, reason: r.reason }));
