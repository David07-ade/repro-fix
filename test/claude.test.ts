import { describe, it, expect } from "vitest";
import { buildClaudeArgs, extractJson, parseClaudeOutput } from "../src/claude.js";

describe("extractJson", () => {
  it("parses bare JSON", () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });
  it("parses a ```json fenced block", () => {
    expect(extractJson('Here you go:\n```json\n{"objective":"x"}\n```\n')).toEqual({ objective: "x" });
  });
  it("parses JSON with prose before and after", () => {
    expect(extractJson('Sure! {"changed":["a.ts"],"explanation":"fixed {it}"} Hope that helps.')).toEqual({
      changed: ["a.ts"],
      explanation: "fixed {it}",
    });
  });
  it("uses the last JSON object when several appear", () => {
    expect(extractJson('first {"a":1} then final {"a":2}')).toEqual({ a: 2 });
  });
  it("throws when there is no JSON", () => {
    expect(() => extractJson("I could not do it.")).toThrow("No JSON found in agent reply");
  });
});

describe("buildClaudeArgs", () => {
  const base = { prompt: "p", cwd: ".", allowedTools: ["Read", "Glob", "Grep"] };
  it("uses headless JSON mode with the default model", () => {
    const a = buildClaudeArgs(base);
    expect(a).toContain("-p");
    expect(a[a.indexOf("--output-format") + 1]).toBe("json");
    expect(a[a.indexOf("--model") + 1]).toBe("sonnet");
    expect(a[a.indexOf("--allowedTools") + 1]).toBe("Read,Glob,Grep");
    expect(a).not.toContain("--permission-mode");
  });
  it("adds acceptEdits and disallowed tools in edit mode", () => {
    const a = buildClaudeArgs({ ...base, editMode: true, disallowedTools: ["Edit(.repro/**)", "Write(.repro/**)"], model: "opus" });
    expect(a[a.indexOf("--permission-mode") + 1]).toBe("acceptEdits");
    expect(a[a.indexOf("--disallowedTools") + 1]).toBe("Edit(.repro/**),Write(.repro/**)");
    expect(a[a.indexOf("--model") + 1]).toBe("opus");
  });
  it("never puts the prompt in argv (it goes via stdin)", () => {
    expect(buildClaudeArgs({ ...base, prompt: "SECRET PROMPT" })).not.toContain("SECRET PROMPT");
  });
});

describe("parseClaudeOutput", () => {
  it("reads result and cost from claude -p JSON", () => {
    expect(parseClaudeOutput('{"type":"result","result":"hi","total_cost_usd":0.01,"is_error":false}')).toEqual({
      text: "hi",
      costUsd: 0.01,
    });
  });
  it("throws a readable error when claude reports is_error", () => {
    expect(() => parseClaudeOutput('{"type":"result","result":"Not logged in","is_error":true}')).toThrow(
      "Claude Code error: Not logged in",
    );
  });
  it("throws when output is not JSON", () => {
    expect(() => parseClaudeOutput("Error: something")).toThrow("Unexpected output from claude -p");
  });
});
