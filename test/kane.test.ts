import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseKaneStream, buildKaneArgs } from "../src/kane.js";

const passed = readFileSync("test/fixtures/kane-passed.ndjson", "utf8");
const failed = readFileSync("test/fixtures/kane-failed.ndjson", "utf8");

describe("parseKaneStream", () => {
  it("parses the passed fixture", () => {
    const r = parseKaneStream(passed, 0);
    expect(r.outcome).toBe("passed");
    expect(r.credits).toBeCloseTo(16.58, 1);
    expect(r.testUrl?.startsWith("https://test-manager")).toBe(true);
    expect(r.oneLiner).toBe("opened more information on iana.org");
    expect(r.finalState.url).toBe("https://www.iana.org/help/example-domains");
  });

  it("exit 1 with a failed run_end is failed", () => {
    const r = parseKaneStream(failed, 1);
    expect(r.outcome).toBe("failed");
    expect(r.reason).toContain("expected a Mug product");
  });

  it("exit 0 but status failed is still failed", () => {
    expect(parseKaneStream(failed, 0).outcome).toBe("failed");
  });

  it("exit 2 is an infra error even with a run_end", () => {
    expect(parseKaneStream(failed, 2).outcome).toBe("infra_error");
  });

  it("garbage with no run_end is an infra error carrying the raw tail", () => {
    const r = parseKaneStream('not json\n{"type":"stream_start"}\nboom', 1);
    expect(r.outcome).toBe("infra_error");
    expect(r.raw).toContain("boom");
    expect(r.credits).toBe(0);
  });

  it("killed process (null exit) is an infra error", () => {
    expect(parseKaneStream(passed, null).outcome).toBe("infra_error");
  });
});

describe("buildKaneArgs", () => {
  it("keeps an objective with quotes as one argument", () => {
    const objective = "Click the 'Apply' button and verify \"Total\" shows $9.00";
    const args = buildKaneArgs({ objective, url: "http://localhost:5173", timeoutS: 120 });
    expect(args[0]).toBe("run");
    expect(args).toContain(objective);
    expect(args).toContain("--agent");
    expect(args).toContain("--headless");
    expect(args[args.indexOf("--timeout") + 1]).toBe("120");
    expect(args[args.indexOf("--url") + 1]).toBe("http://localhost:5173");
  });
});
