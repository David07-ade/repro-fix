# Demo video script (target 4:00, max 5:00)

Faceless format: screen recording + on-screen captions (or a TTS/voiceover if you prefer). No face cam needed.
Record at 1920×1080. Terminal font ≥ 18 pt. Speed up Kane waits 4–8× and label them "⏩ 8×".

## Setup before recording

```bash
cd repro-fix && git checkout buggy-demo -- demo/brightcart/src   # put the bugs back
rm -rf demo/brightcart/.repro                                    # fresh start (reports are in git history)
cd demo/brightcart && npm run dev                                # terminal 1
```
Browser on http://localhost:5173, terminal 2 in `demo/brightcart`.

## Shots

| Time | Screen | Caption / voiceover |
|---|---|---|
| 0:00–0:20 | Terminal: an agent saying "Fixed! ✅" (mock text), then a red ✖ | "AI coding agents love to say *fixed*. How do you know it's true?" |
| 0:20–0:40 | Title card: **repro-fix**. "No fix without a failing test." | "repro-fix makes the agent prove the bug in a real browser first, using Kane CLI." |
| 0:40–1:05 | Brightcart in the browser: type FALL10 → "Coupon FALL10 applied" | "Here's a shop. This coupon expired last month, but it still works. Bug #1." |
| 1:05–2:15 | Terminal: `repro-fix "Expired coupon FALL10 is still accepted…" --no-commit`. Show 🧠 → 🧪 objective → 🔴 Reproduced (⏩) → 🔧 → 🟢 | "Claude reads the app and writes a plain-English Kane test. Kane runs it in real Chrome, and it **fails**: bug confirmed. The test is now frozen. Kane's evidence goes to Claude, Claude fixes the code, and Kane re-runs the *exact same* test. Green." |
| 2:15–2:35 | Browser: FALL10 → "This coupon has expired" | "Same browser, same steps. Fixed for real." |
| 2:35–3:05 | Open the report `.repro/reports/…md` (rendered preview): runs table, diff, Kane links. Click a Kane Test Manager link → show the run. | "Every run leaves a report: red run, diff, green run, and Kane's recorded evidence." |
| 3:05–3:35 | Terminal: bug #2 (search) ⏩. Highlight the 🧪 Regression line. | "Bug two. After the fix, repro-fix re-runs every earlier test, so a fix can't quietly break something else." |
| 3:35–3:50 | Terminal: `repro-fix test` → all 🟢 | "Every fixed bug becomes a permanent plain-English regression test." |
| 3:50–4:10 | README guardrails section | "No fix without a red run. Frozen tests. The agent can't touch saved tests. Infra errors aren't bugs." |
| 4:10–4:25 | Repo URL + "Built with Claude Code · verified with Kane CLI" | "Open source. Link below." |

## Description (YouTube)

repro-fix: your coding agent has to reproduce the bug in a real browser (Kane CLI) before it's allowed to fix it, then prove the fix with the exact same test.
Repo: https://github.com/David07-ade/repro-fix
Built for the TestMu AI Kane CLI hackathon. #KaneCLI #TestMuAI #ClaudeCode
