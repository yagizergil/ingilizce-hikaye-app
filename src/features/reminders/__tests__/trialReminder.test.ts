import {
  trialChargeDate,
  trialReminderDay,
  trialReminderFireAt,
} from "@/features/reminders/trialReminder";

describe("trial reminder date math", () => {
  it("reminds on day 5 of a 7-day trial", () => {
    expect(trialReminderDay(7)).toBe(5);
    expect(trialReminderDay(14)).toBe(12);
  });

  it("3-day trial (product decision): Today -> Day 2 reminder -> Day 3 charge", () => {
    expect(trialReminderDay(3)).toBe(2);
  });

  it("fires 24 hours before the end of a 3-day trial", () => {
    const now = new Date(2026, 9, 12, 14, 0);
    const end = new Date(2026, 9, 15, 14, 0);
    expect(trialReminderFireAt(end, now)).toEqual(new Date(2026, 9, 14, 14, 0));
  });

  it("has no reminder row for trials too short to remind", () => {
    expect(trialReminderDay(2)).toBe(1);
    expect(trialReminderDay(1)).toBeNull();
  });

  it("charges exactly trialDays later", () => {
    const now = new Date(2026, 9, 12, 10, 30);
    expect(trialChargeDate(now, 7)).toEqual(new Date(2026, 9, 19, 10, 30));
  });

  it("fires 48 hours before a 7-day trial ends at a daytime hour", () => {
    const now = new Date(2026, 9, 12, 14, 0);
    const end = new Date(2026, 9, 19, 14, 0);
    expect(trialReminderFireAt(end, now)).toEqual(new Date(2026, 9, 17, 14, 0));
  });

  it("moves a night-time reminder into the day (never later than the end)", () => {
    const now = new Date(2026, 9, 12, 2, 0);
    const end = new Date(2026, 9, 19, 2, 0);
    expect(trialReminderFireAt(end, now)).toEqual(new Date(2026, 9, 17, 9, 0));

    const lateNow = new Date(2026, 9, 12, 23, 30);
    const lateEnd = new Date(2026, 9, 19, 23, 30);
    expect(trialReminderFireAt(lateEnd, lateNow)).toEqual(new Date(2026, 9, 17, 20, 0));
  });

  it("returns null when the reminder would be in the past", () => {
    const now = new Date(2026, 9, 12, 12, 0);
    const end = new Date(2026, 9, 12, 12, 30);
    expect(trialReminderFireAt(end, now)).toBeNull();
  });
});
