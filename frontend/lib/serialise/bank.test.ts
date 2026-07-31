import { describe, expect, it } from "vitest";
import { isOpenNow, toBankCard } from "./bank";

describe("isOpenNow", () => {
  const hours = { mon: ["09:00", "17:00"] as [string, string] };

  it("is open within the day's hours", () => {
    const now = new Date("2026-08-03T12:00:00"); // a Monday
    expect(isOpenNow(hours, now)).toBe(true);
  });

  it("is closed outside the day's hours", () => {
    const now = new Date("2026-08-03T20:00:00");
    expect(isOpenNow(hours, now)).toBe(false);
  });

  it("is closed on a day with no configured hours", () => {
    const now = new Date("2026-08-04T12:00:00"); // a Tuesday
    expect(isOpenNow(hours, now)).toBe(false);
  });

  it("is closed when opening_hours is null", () => {
    expect(isOpenNow(null)).toBe(false);
  });
});

describe("toBankCard", () => {
  it("never includes policy_notes - admin-visible only per PRD.md §4.4", () => {
    const row = {
      id: "b1",
      name: "PLACEHOLDER Blood Bank",
      address: "PLACEHOLDER address",
      phone: "0000000000",
      opening_hours: null,
    };
    const card = toBankCard(row);
    expect(card).not.toHaveProperty("policyNotes");
    expect(card).not.toHaveProperty("policy_notes");
  });
});
