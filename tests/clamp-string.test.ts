import { describe, it, expect } from "vitest";
import { clampString } from "@/lib/clamp-string";

describe("clampString", () => {
  it("truncates with ellipsis when over max", () => {
    expect(clampString("hello world", 8)).toBe("hello w…");
  });

  it("returns unchanged when within max", () => {
    expect(clampString("hi", 10)).toBe("hi");
  });
});
