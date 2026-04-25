import { describe, expect, it } from "vitest";
import { getAccessibleView, getAllowedViews } from "./account.ts";

describe("workspace account access helpers", () => {
  it("blocks premium views on free tier", () => {
    expect(getAllowedViews("personal", "free", "active").has("timeTracking")).toBe(
      false,
    );
    expect(getAllowedViews("business", "free", "active").has("dispatch")).toBe(
      false,
    );
  });

  it("allows premium views on pro tier", () => {
    expect(getAllowedViews("personal", "pro", "active").has("timeTracking")).toBe(
      true,
    );
    expect(getAllowedViews("business", "pro", "active").has("dispatch")).toBe(
      true,
    );
  });

  it("falls back to dashboard for forbidden or inactive-license views", () => {
    expect(getAccessibleView("personal", "dispatch", "pro", "active")).toBe(
      "dashboard",
    );
    expect(getAccessibleView("business", "projects", "enterprise", "past_due")).toBe(
      "dashboard",
    );
  });
});
