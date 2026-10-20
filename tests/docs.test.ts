import { describe, expect, it } from "vitest";
import { PRESETS } from "../src/engine/presets";
import readme from "../README.md?raw";
import bib from "../citations.bib?raw";

describe("README claims that can drift from the code", () => {
  it("states the number of bibliography entries citations.bib actually has", () => {
    const entries = (bib.match(/^@\w+\{/gm) ?? []).length;
    const claims = [...readme.matchAll(/all (\d+) sources/g)].map((m) => Number(m[1]));
    expect(claims.length).toBeGreaterThan(0);
    for (const n of claims) expect(n).toBe(entries);
  });

  it("lists every preset in its gallery tables", () => {
    const rows = readme
      .split("## Preset gallery")[1]
      .split("## Benchmarks")[0]
      .split("\n")
      .filter((l) => /^\| .+ \| `.+` \|/.test(l));
    expect(rows.length).toBe(PRESETS.length);
    const summary = readme.match(/Remaining presets \((\d+) of the (\d+)\)/);
    expect(summary).not.toBeNull();
    expect(Number(summary![2])).toBe(PRESETS.length);
  });

  it("does not promise a live highway detector as future work", () => {
    expect(readme.split("## Roadmap")[1].split("## References")[0]).not.toMatch(/live highway detector/);
  });
});
