# Launch posts (post at least two)

Replace `<VIDEO>` with the YouTube link.

---

## Hacker News: Show HN

**Title:** Show HN: repro-fix – make your coding agent reproduce a bug in a real browser before fixing it

**Text:**
Coding agents are quick to say "fixed". I wanted proof, so I built a small CLI around a rule borrowed from good bug triage: no fix without a failing test.

You give it a plain-English bug report. Claude Code (run headless) reads the app and writes a plain-English browser test for Kane CLI. Kane runs it in real Chrome, and it has to fail. Then the test is frozen, Kane's evidence (what it saw, which check failed, the extracted page values) goes to the fixer, and the identical test is re-run until it passes. Every saved test re-runs afterwards as a regression suite.

Guardrails: if the test can't be made to fail, no code is touched; the fixer can't edit saved tests (tool deny rules plus a hash check); Kane infra errors are never counted as a reproduction.

Repo (MIT), with real red→green reports committed: https://github.com/David07-ade/repro-fix
4-minute demo: <VIDEO>
Try the buggy demo shop: https://brightcart-demo.vercel.app

Built for the TestMu AI Kane CLI hackathon. I'd love feedback on the loop design, especially the "freeze the test" part.

---

## X / Twitter (thread)

1/ AI agents: "Fixed! ✅"
Me: prove it.

I built repro-fix: the agent must reproduce the bug in a real browser before it's allowed to touch the code. 🧵 <VIDEO>

2/ You type a bug in plain English.
→ Claude Code writes a plain-English test
→ @testmuai Kane CLI runs it in real Chrome
→ it has to FAIL 🔴
→ test is frozen 🔒

3/ Kane's evidence (what it saw, why it failed) goes back to the agent. It fixes the code. Kane re-runs the exact same test. 🟢
Then every previously fixed bug re-runs too, so fixes can't quietly break other things.

4/ The agent can't edit the tests to make them pass, and infra errors never count as a "repro".
Open source: https://github.com/David07-ade/repro-fix
Break the demo shop yourself: https://brightcart-demo.vercel.app
#KaneCLI #ClaudeCode

---

## LinkedIn

"Fixed" is the most common word from AI coding agents, and the least verified.

For the TestMu AI Kane CLI hackathon I built **repro-fix**, which applies an old QA rule to agents: *no fix without a failing test.*

How it works:
🧠 Claude Code reads the app and writes a test in plain English
🔴 Kane CLI runs it in a real browser, and it must fail (bug reproduced)
🔒 The test is frozen, so the agent can't weaken it
🔧 Kane's evidence goes back to the agent, which fixes the code
🟢 Kane re-runs the identical test, then all earlier ones as a regression suite
📄 Every run leaves a report with the red run, the diff, the green run and recorded evidence

Demo (4 min): <VIDEO>
Code (MIT): https://github.com/David07-ade/repro-fix
Live demo shop (with the bugs): https://brightcart-demo.vercel.app

#AI #SoftwareTesting #QA #ClaudeCode #KaneCLI

---

## Reddit (r/ClaudeAI or r/QualityAssurance)

**Title:** I made Claude Code reproduce bugs in a real browser before it's allowed to fix them

Body: same as the HN text, plus a GIF of the 🔴 → 🔧 → 🟢 terminal output. Mention it runs through your normal Claude Code login (`claude -p`), so no API key is needed.
