# repro-fix — design

Date: 2026-11-24 · Hackathon deadline: 2026-11-26 23:59 IST (18:29 UTC)

## Intent

Coding agents are quick to say "fixed!" without proof. **repro-fix** won't let an agent
fix a bug until it has **reproduced it in a real browser**. Given a plain-English bug
report, the agent writes a Kane CLI test, watches it **fail**, fixes the code, and
keeps going until the same test **passes**. The failing-then-passing test becomes a
permanent regression check.

It is built for the TestMu AI / Kane CLI hackathon. Judges reward verifying with Kane
and, as extra credit, *feeding Kane's results back into the agent loop*. That loop is
the whole product here.

## Goals

- `repro-fix "<bug report>"` runs the full loop on any web app running at a URL.
- Proof before fix: no code is changed until Kane has confirmed a failure.
- Each Kane failure (summary, reason, final page state) goes back to the fix agent.
- Every run ends with a readable report: red run, fix diff, green run, Kane Test
  Manager links, credits used.
- A demo shop app with planted bugs that shows 3 red→green fixes on camera.

## Non-goals

- Mobile (Kane's mobile mode needs macOS on Apple Silicon; we're on Windows).
- Hosting the tool as a web service.
- Languages or frameworks beyond what the demo app needs (the tool itself is
  framework-agnostic because it only edits files and drives a URL).

## Anti-goals (failure even if it "works")

- The agent makes the test easier so it passes. Once a failure is confirmed, the
  test is **frozen**: the fix step can't edit it, and the green run uses the
  same text, byte for byte.
- The agent claims a fix without a red run first.
- Infra errors (Kane crash, timeout) are counted as "bug reproduced".
- Anything in the repo, video or posts that links to the user's YouTube channels.

## Constraints

- About 2.5 days. Windows 11, Node 26, Chrome installed, Kane CLI 0.10.8 logged in.
- One Kane run ≈ 35 s and ≈ 17 credits. The loop caps attempts so a run stays
  around 10 Kane calls at most.
- Repo must be public, created on/after Nov 12 (it will be created today).
- Kane on Windows: `npm i -g @testmuai/kane-cli` skipped the
  `@testmuai/kane-cli-win-x64` add-on that contains `v16-runner.exe`, and runs failed
  with exit 2 ("v16-runner not found"). Workaround (verified): `npm install
  --no-save @testmuai/kane-cli-win-x64@<same version>` inside the global kane-cli
  folder. This goes in the README troubleshooting section.

## Verified Kane contract (from a real run)

`kane-cli run "<objective>" --url <url> --agent --headless --timeout <s>` writes
NDJSON to stdout. The last line is `{"type":"run_end", ...}` with:
`status` ("passed"/…), `summary`, `one_liner`, `reason`, `final_state` (object),
`test_url` (Test Manager share link), `credits_consumed`, `result_code`,
`reason_code`, `duration`. Exit codes: 0 = passed, 1 = not passed, 2/3 =
error/timeout → **infra error**, never a reproduction.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (picked)** | Standalone Node/TypeScript CLI that drives **Claude Code headless** (`claude -p`), with Kane wrapped as a tool and a deterministic loop around it | Real installable tool; the loop is readable code. Most work, but fits in the time. |
| B | Claude Code skill + `/repro-fix` command | Fastest, but it's a recipe, not a product; the loop is "Claude followed instructions". |
| C | GitHub Action: label an issue → PR | Flashiest, but CI needs Kane auth, credits and a key, and remote debugging time we don't have. **Stretch goal** on top of A. |

The user picked A.

## How it works

### The loop (deterministic code calls the agent at set points)

1. **Reproduce.** The agent reads the bug report plus the target app's source and
   writes **one Kane objective**: plain-English steps that end in a check which
   *passes when the bug is fixed*. repro-fix runs it.
   - Kane says **failed** → bug reproduced. The objective is frozen. Go to 2.
   - Kane says **passed** → not reproduced. The agent gets Kane's summary and
     may rewrite the objective (max 2 retries). If it still passes, stop:
     "Could not reproduce", with the evidence. No code is changed.
   - Infra error → retry once, then stop with the error.
2. **Fix.** The agent gets the bug report, the frozen objective and the full
   Kane failure (`summary`, `reason`, `final_state`, `one_liner`). It edits the app
   source. The fix agent's file tools refuse writes under `.repro/`.
3. **Verify.** Re-run the frozen objective.
   - Passed → go to 4.
   - Failed → the new Kane failure goes back to step 2 (max 3 fix attempts total).
     Then stop: "Fix not verified", leaving the code changes in place for review.
4. **Regression.** Re-run every saved test in `.repro/tests/`. If one broke, its
   failure goes back to the fix step (counts against the same attempt cap).
5. **Record.** Save the objective to `.repro/tests/<slug>.md`, write the report
   `.repro/reports/<timestamp>-<slug>.md`, and, if the target is a git repo, commit
   on a branch `repro-fix/<slug>` (no push).

### Pieces

- **`kane.ts`**: spawns kane-cli, parses NDJSON, returns
  `{outcome: passed|failed|infra_error, summary, reason, finalState, testUrl, credits, durationS}`.
- **`agent.ts`**: `claude -p` sessions for "write objective" and "fix", with
  file read/edit tools limited to the target project and `.repro/` blocked for
  fixes.
- **`loop.ts`**: the state machine above, caps, and live terminal output
  (🔴 reproduced → 🔧 fixing → 🟢 verified).
- **`report.ts`**: the markdown report.
- **Config** `repro.config.json` in the target project:
  `{ "url": "http://localhost:3000", "start": "npm run dev" }`. If `start` is set
  and the URL isn't up, repro-fix starts the app and waits for it.
- **CLI:** `repro-fix "<bug>"`, `repro-fix --issue <file.md>`, `repro-fix test`
  (runs the whole saved regression suite through Kane).

### Demo app: "Brightcart"

A small Vite + React shop in `demo/brightcart` (product list, search, cart,
coupons, checkout summary) with planted bugs, each a realistic one-liner:

1. An expired coupon `FALL10` is still accepted.
2. Search is case-sensitive ("Mug" finds it, "mug" doesn't).
3. Cart quantity can be decreased below 1 (shows 0 or −1 and a negative total).
4. (Spare) Total rounds wrong with two discounted items.

Video plan: bugs 1–3 go red→green live (with timeouts sped up), then
`repro-fix test` runs green.

### Repo deliverables

`README.md` (pitch, loop diagram, install, quick start on Brightcart, Windows
troubleshooting, how Kane results feed the agent), MIT license, example reports
committed under `demo/brightcart/.repro/`, and draft video script plus 2 post drafts
in `docs/launch/`.

## Calls I made (correct any)

- Name `repro-fix`; repo `repro-fix` on your GitHub, public.
- TypeScript; agent = `claude -p`, default model `sonnet` (fast and
  cheap enough for loops), overridable with `--model`.
- Attempt caps: 2 objective retries, 3 fix attempts.
- Demo app in Vite + React rather than Next.js: faster to start, simpler for Kane.
- No push or PR by the CLI itself; it commits locally only.

## Decided: no API key — Claude Code headless

The user has no Anthropic API key and doesn't want to pay for one. The agent steps
call **Claude Code in headless mode** (`claude -p ... --output-format json`) as a
subprocess, using the user's existing Claude Code login. This replaces the Agent
SDK everywhere above.

- Objective step: `claude -p` with read-only tools (`Read,Glob,Grep`); it returns
  the objective as JSON in its final message.
- Fix step: `claude -p` with `Read,Glob,Grep,Edit,Write`,
  `--permission-mode acceptEdits`, cwd = target project, and
  `--disallowedTools "Edit(.repro/**)" "Write(.repro/**)"`.
- Belt and braces: repro-fix hashes `.repro/` before each fix and aborts if it
  changed. The frozen objective lives in memory and is what gets re-run.
- Requirement written in the README: Claude Code installed and logged in. That
  fits the hackathon ("any AI coding agent").

## Left to the builder

Internal module layout, prompts, terminal styling, report layout, Brightcart
styling.
