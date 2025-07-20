import { getComplexityIndicator } from "../utils/complexityHelperUtils";

describe("Complexity Helper Utils", () => {
  test("should return EXCELLENT for O(1)", () => {
    expect(getComplexityIndicator("O(1)")).toBe("EXCELLENT");
  });

  test("should return GOOD for O(log n)", () => {
    expect(getComplexityIndicator("O(log n)")).toBe("GOOD");
  });

  test("should return GOOD for O(n)", () => {
    expect(getComplexityIndicator("O(n)")).toBe("GOOD");
  });

  test("should return FAIR for O(n log n)", () => {
    expect(getComplexityIndicator("O(n log n)")).toBe("FAIR");
  });

  test("should return POOR for O(n²)", () => {
    expect(getComplexityIndicator("O(n²)")).toBe("POOR");
  });

  test("should return BAD for O(2^n)", () => {
    expect(getComplexityIndicator("O(2^n)")).toBe("BAD");
  });

  test("should return TERRIBLE for O(n!)", () => {
    expect(getComplexityIndicator("O(n!)")).toBe("TERRIBLE");
  });

  test("should handle unknown complexity notation", () => {
    expect(getComplexityIndicator("O(unknown)")).toBe("UNKNOWN");
  });

  test("should handle edge cases", () => {
    expect(getComplexityIndicator("")).toBe("UNKNOWN");
    expect(getComplexityIndicator("  O(1)  ")).toBe("EXCELLENT");
  });
});
