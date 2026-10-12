import { describeError } from "@/lib/errorDescription";

describe("describeError", () => {
  it("reads PostgREST error objects instead of printing [object Object]", () => {
    const result = describeError({
      message: 'new row violates check constraint "srs_reviews_rating_check"',
      code: "23514",
      details: "Failing row contains (...)",
      hint: null,
    });
    expect(result.message).toContain("srs_reviews_rating_check");
    expect(result.code).toBe("23514");
    expect(result.details).toBe("Failing row contains (...)");
  });

  it("keeps Error messages", () => {
    expect(describeError(new Error("boom")).message).toBe("boom");
  });

  it("serializes objects without a message", () => {
    expect(describeError({ foo: 1 }).message).toBe('{"foo":1}');
  });

  it("never returns [object Object]", () => {
    expect(describeError({}).message).not.toContain("[object Object]");
    expect(describeError("plain").message).toBe("plain");
  });
});
