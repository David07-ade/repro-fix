import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { ensureAppUp, isUp } from "../src/app.js";
import { parseArgs } from "../src/cli.js";

describe("ensureAppUp", () => {
  it("reports started:false when the app is already up", async () => {
    const srv = createServer((_, res) => res.end("ok")).listen(0);
    await new Promise((r) => srv.once("listening", r));
    const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
    const r = await ensureAppUp(url);
    expect(r.started).toBe(false);
    srv.close();
  });

  it("throws a readable message when the app is down and there is no start command", async () => {
    await expect(ensureAppUp("http://127.0.0.1:9")).rejects.toThrow(
      'App not reachable at http://127.0.0.1:9. Start it or set "start" in repro.config.json.',
    );
  });

  it("starts the app with the start command and waits until it answers", async () => {
    const port = 47000 + Math.floor(Math.random() * 1000);
    const start = `node -e "require('http').createServer((q,s)=>s.end('ok')).listen(${port})"`;
    const r = await ensureAppUp(`http://127.0.0.1:${port}`, start, 15000);
    expect(r.started).toBe(true);
    expect(await isUp(`http://127.0.0.1:${port}`)).toBe(true);
    r.stop();
  });
});

describe("parseArgs", () => {
  it("reads a bug and flags", () => {
    expect(parseArgs(["Coupon 'FALL10' works", "--url", "http://x", "--model", "opus", "--no-commit"])).toEqual({
      cmd: "fix",
      bug: "Coupon 'FALL10' works",
      url: "http://x",
      model: "opus",
      commit: false,
    });
  });
  it("reads the test subcommand", () => {
    expect(parseArgs(["test"]).cmd).toBe("test");
  });
  it("reads --issue", () => {
    expect(parseArgs(["--issue", "bug.md"])).toMatchObject({ cmd: "fix", issue: "bug.md", commit: true });
  });
  it("shows help with no args", () => {
    expect(parseArgs([]).cmd).toBe("help");
  });
});

describe("killTree", () => {
  it("kills a shell-started process tree so its server stops answering", async () => {
    const { killTree } = await import("../src/proc.js");
    const { spawn } = await import("node:child_process");
    const port = 48000 + Math.floor(Math.random() * 1000);
    const child = spawn(`node -e "require('http').createServer((q,s)=>s.end('ok')).listen(${port})"`, { shell: true, stdio: "ignore" });
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 40 && !(await isUp(url)); i++) await new Promise((r) => setTimeout(r, 250));
    expect(await isUp(url)).toBe(true);
    killTree(child);
    await new Promise((r) => setTimeout(r, 1000));
    expect(await isUp(url, 1000)).toBe(false);
  });
});
