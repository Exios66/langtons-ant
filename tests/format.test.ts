import { describe, expect, it } from "vitest";
import { fmtCompact } from "../src/app/format";

describe("fmtCompact", () => {
  it("formats magnitudes with a unit suffix", () => {
    expect(fmtCompact(0)).toBe("0");
    expect(fmtCompact(12.34)).toBe("12.3");
    expect(fmtCompact(950)).toBe("950");
    expect(fmtCompact(1234)).toBe("1.2k");
    expect(fmtCompact(34_000)).toBe("34k");
    expect(fmtCompact(5_600_000)).toBe("5.6M");
    expect(fmtCompact(-2500)).toBe("-2.5k");
    expect(fmtCompact(NaN)).toBe("—");
  });

  it("carries into the next unit when rounding reaches 1000", () => {
    expect(fmtCompact(999.96)).toBe("1k");
    expect(fmtCompact(999_600)).toBe("1M");
    expect(fmtCompact(999_960_000)).toBe("1B");
  });
});
