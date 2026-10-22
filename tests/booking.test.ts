import { describe, it, expect } from "vitest";
import source from "../data/task3-booking.json";
import {
  zoneFor,
  dateAt,
  wallInstant,
  makeSlots,
  groupStarts,
  slotKey,
  addDays,
  dayReason,
  type Provider,
} from "../lib/booking/engine";
const providers = source.providers as Provider[];
describe("timezone normalization", () => {
  it("handles every messy provider timezone", () => {
    expect(providers.map(zoneFor)).toEqual([
      "Asia/Bangkok",
      "Asia/Kathmandu",
      "Asia/Kathmandu",
      "Asia/Kathmandu",
      "Asia/Kathmandu",
      "Asia/Kolkata",
    ]);
  });
  it("converts provider wall time to Kathmandu correctly", () => {
    const instant = wallInstant("2026-11-10", "10:00", "Asia/Bangkok");
    expect(instant.toISOString()).toBe("2026-11-10T03:00:00.000Z");
    expect(dateAt(instant, "Asia/Kathmandu")).toBe("2026-11-10");
  });
  it("handles the edges of local days", () => {
    expect(dateAt(new Date("2026-10-21T18:30:00Z"), "Asia/Bangkok")).toBe(
      "2026-10-22",
    );
    expect(dateAt(new Date("2026-10-21T18:30:00Z"), "Asia/Kathmandu")).toBe(
      "2026-10-22",
    );
  });
});
describe("slot eligibility", () => {
  const p = providers[0];
  const date = "2026-10-23";
  const now = new Date("2026-10-21T00:00:00Z");
  it("repeats at duration plus buffer, never after specialist close", () => {
    const slots = makeSlots(p, p.specialists[0], date, [], new Set(), now);
    expect(slots.map((s) => s.startTime).slice(0, 4)).toEqual([
      "10:00",
      "10:40",
      "11:20",
      "12:00",
    ]);
    expect(slots.at(-1)?.startTime).toBe("15:20");
  });
  it("clamps late consultation to provider hours", () => {
    const slots = makeSlots(p, p.specialists[1], date, [], new Set(), now);
    expect(slots).toHaveLength(0);
  });
  it("clamps early consultation to provider hours", () => {
    const slots = makeSlots(p, p.specialists[2], date, [], new Set(), now);
    expect(slots[0].startTime).toBe("08:00");
  });
  it("blocks an entire consecutive group if the middle slot is booked", () => {
    const booked = new Set([slotKey(p.id, p.specialists[0].id, date, "10:40")]);
    const slots = makeSlots(p, p.specialists[0], date, [], booked, now);
    expect(groupStarts(slots, 2).some((s) => s.startTime === "10:00")).toBe(
      false,
    );
    expect(groupStarts(slots, 2).some((s) => s.startTime === "11:20")).toBe(
      true,
    );
  });
  it("enforces closure, past date, and 90-day window", () => {
    expect(dayReason(p, "2026-10-20", [], now)).toBe("Past date");
    const today = dateAt(now, zoneFor(p));
    expect(dayReason(p, addDays(today, 90), [], now)).toBe(
      "Outside 90-day booking window",
    );
    expect(
      dayReason(
        p,
        date,
        [{ providerId: p.id, date, reason: "Public holiday" }],
        now,
      ),
    ).toBe("Public holiday");
  });
  it("disables already started slots using provider time", () => {
    const today = dateAt(now, zoneFor(p));
    const slots = makeSlots(
      p,
      p.specialists[0],
      today,
      [],
      new Set(),
      new Date(`${today}T05:00:00Z`),
    );
    expect(slots.find((s) => s.startTime === "10:00")?.isBooked).toBe(true);
  });
});
