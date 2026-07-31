import { describe, expect, it } from "vitest";
import { toStockRow } from "./stock";

const baseRow = {
  blood_group: "O+",
  component: "whole_blood",
  units: 4,
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("toStockRow", () => {
  it("is not stale just under the threshold", () => {
    const now = new Date("2026-01-01T05:59:00.000Z");
    const row = toStockRow(baseRow, 6, now);
    expect(row.isStale).toBe(false);
  });

  it("is stale once past the threshold", () => {
    const now = new Date("2026-01-01T06:01:00.000Z");
    const row = toStockRow(baseRow, 6, now);
    expect(row.isStale).toBe(true);
  });

  it("maps snake_case to camelCase without losing data", () => {
    const row = toStockRow(baseRow, 6, new Date("2026-01-01T01:00:00.000Z"));
    expect(row.bloodGroup).toBe("O+");
    expect(row.units).toBe(4);
    expect(row.updatedAt).toBe(baseRow.updated_at);
  });
});
