import { describe, expect, it } from "vitest";
import {
  formatAuthRateLimitMessage,
  formatAuthUserFacingError,
} from "./auth-errors.ts";

describe("formatAuthRateLimitMessage", () => {
  it("detects message substring", () => {
    expect(
      formatAuthRateLimitMessage(new Error("Email rate limit exceeded")),
    ).toContain("SMTP");
  });

  it("detects HTTP 429 status", () => {
    const err = Object.assign(new Error("Too Many Requests"), { status: 429 });
    expect(formatAuthRateLimitMessage(err)).toContain("SMTP");
  });

  it("returns null for unrelated errors", () => {
    expect(formatAuthRateLimitMessage(new Error("Invalid login"))).toBeNull();
  });
});

describe("formatAuthUserFacingError", () => {
  it("uses fallback for unknown errors", () => {
    expect(formatAuthUserFacingError(null, "Fallback.")).toBe("Fallback.");
  });
});
