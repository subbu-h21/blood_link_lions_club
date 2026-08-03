import { describe, expect, it } from "vitest";
import {
  firstAcceptanceMinutes,
  acceptanceToDonationMinutes,
  classifyProspectOutcome,
  adminResponseMinutes,
  type ProspectForMetrics,
} from "./requests";

describe("firstAcceptanceMinutes", () => {
  const createdAt = "2026-08-03T10:00:00Z";

  it("returns null when no prospect has moved past invited", () => {
    const prospects: ProspectForMetrics[] = [{ status: "invited", respondedAt: null, outcomeAt: null }];
    expect(firstAcceptanceMinutes(createdAt, prospects)).toBeNull();
  });

  it("ignores a declined-but-still-invited prospect (Unit 24's own reasoning)", () => {
    const prospects: ProspectForMetrics[] = [
      { status: "invited", respondedAt: "2026-08-03T10:05:00Z", outcomeAt: null },
    ];
    expect(firstAcceptanceMinutes(createdAt, prospects)).toBeNull();
  });

  it("takes the earliest acceptance across multiple prospects", () => {
    const prospects: ProspectForMetrics[] = [
      { status: "accepted", respondedAt: "2026-08-03T10:30:00Z", outcomeAt: null },
      { status: "rejected", respondedAt: "2026-08-03T10:10:00Z", outcomeAt: "2026-08-03T11:00:00Z" },
    ];
    expect(firstAcceptanceMinutes(createdAt, prospects)).toBe(10);
  });
});

describe("acceptanceToDonationMinutes", () => {
  it("returns null for a non-donated prospect", () => {
    const prospect: ProspectForMetrics = {
      status: "accepted",
      respondedAt: "2026-08-03T10:00:00Z",
      outcomeAt: null,
    };
    expect(acceptanceToDonationMinutes(prospect)).toBeNull();
  });

  it("computes the delta for a donated prospect", () => {
    const prospect: ProspectForMetrics = {
      status: "donated",
      respondedAt: "2026-08-03T10:00:00Z",
      outcomeAt: "2026-08-03T12:00:00Z",
    };
    expect(acceptanceToDonationMinutes(prospect)).toBe(120);
  });
});

describe("classifyProspectOutcome", () => {
  it("classifies a still-invited, responded prospect as declined", () => {
    const prospect: ProspectForMetrics = { status: "invited", respondedAt: "2026-08-03T10:00:00Z", outcomeAt: null };
    expect(classifyProspectOutcome(prospect, "finding_prospects")).toBe("declined");
  });

  it("classifies a never-responded prospect on an active request as neither (too early)", () => {
    const prospect: ProspectForMetrics = { status: "invited", respondedAt: null, outcomeAt: null };
    expect(classifyProspectOutcome(prospect, "finding_prospects")).toBe("other");
  });

  it("classifies a never-responded prospect on a resolved request as ignored", () => {
    const prospect: ProspectForMetrics = { status: "invited", respondedAt: null, outcomeAt: null };
    expect(classifyProspectOutcome(prospect, "resolved")).toBe("ignored");
  });

  it("classifies a never-responded prospect on a closed request as ignored", () => {
    const prospect: ProspectForMetrics = { status: "invited", respondedAt: null, outcomeAt: null };
    expect(classifyProspectOutcome(prospect, "closed")).toBe("ignored");
  });

  it("classifies an accepted prospect as other", () => {
    const prospect: ProspectForMetrics = {
      status: "accepted",
      respondedAt: "2026-08-03T10:00:00Z",
      outcomeAt: null,
    };
    expect(classifyProspectOutcome(prospect, "evaluating_prospects")).toBe("other");
  });
});

describe("adminResponseMinutes", () => {
  it("returns null when never notified", () => {
    expect(adminResponseMinutes(null, "2026-08-03T10:00:00Z")).toBeNull();
  });

  it("returns null when never assigned an owner", () => {
    expect(adminResponseMinutes("2026-08-03T10:00:00Z", null)).toBeNull();
  });

  it("computes the notify-to-ownership gap", () => {
    expect(adminResponseMinutes("2026-08-03T10:00:00Z", "2026-08-03T10:45:00Z")).toBe(45);
  });
});
