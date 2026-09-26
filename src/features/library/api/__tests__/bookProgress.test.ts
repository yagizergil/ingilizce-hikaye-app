import { computeBookProgress } from "@/features/library/api/bookProgress";

const sections = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

describe("computeBookProgress", () => {
  it("is zero when there is no row", () => {
    expect(computeBookProgress(sections, null)).toEqual({
      percent: 0,
      hasStarted: false,
      isFinished: false,
      currentPosition: null,
    });
  });

  it("does not show 100% at the end of the FIRST chapter of a 4-chapter book", () => {
    const result = computeBookProgress(sections, { section_id: "a", percent: 100 });
    expect(result.percent).toBe(25);
    expect(result.hasStarted).toBe(true);
  });

  it("counts finished chapters plus the current chapter's share", () => {
    expect(computeBookProgress(sections, { section_id: "c", percent: 50 }).percent).toBe(63);
  });

  it("never reaches 100% until the book is marked finished", () => {
    expect(computeBookProgress(sections, { section_id: "d", percent: 100 }).percent).toBe(99);
  });

  it("is 100% and finished when finished_at is set", () => {
    const result = computeBookProgress(sections, {
      section_id: "d",
      percent: 100,
      finished_at: "2026-09-26T10:00:00Z",
    });
    expect(result).toEqual({
      percent: 100,
      hasStarted: true,
      isFinished: true,
      currentPosition: null,
    });
  });

  it("treats an unknown section as not started", () => {
    expect(computeBookProgress(sections, { section_id: "zzz", percent: 40 }).hasStarted).toBe(
      false,
    );
  });
});
