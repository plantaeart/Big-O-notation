import { analyzeSpaceComplexity } from "../analysis/spaceAnalyzer";

describe("Space Complexity Detection Tests", () => {
  describe("O(1) Constant Space", () => {
    test("should identify simple operations as O(1) space", () => {
      const pythonCode = `def get_first_element(arr):
    if arr:
        return arr[0]
    return None`;

      const lines = pythonCode.split("\n");
      const result = analyzeSpaceComplexity(lines);

      expect(result.notation).toBe("O(1)");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should identify mathematical operations as O(1) space", () => {
      const pythonCode = `def calculate_sum(a, b):
    result = a + b
    return result * 2`;

      const result = analyzeSpaceComplexity(pythonCode);

      expect(result.notation).toBe("O(1)");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });
  });

  describe("O(n) Linear Space", () => {
    test("should identify list creation in loop as O(n) space", () => {
      const pythonCode = `def create_list(n):
    result = []
    for i in range(n):
        result.append(i)
    return result`;

      const result = analyzeSpaceComplexity(pythonCode);

      expect(result.notation).toBe("O(n)");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should identify list comprehension as O(n) space", () => {
      const pythonCode = `def square_numbers(numbers):
    return [x * x for x in numbers]`;

      const result = analyzeSpaceComplexity(pythonCode);

      expect(result.notation).toBe("O(n)");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should identify accumulator pattern as O(n) space", () => {
      const pythonCode = `def filter_positive(numbers):
    result = []
    for num in numbers:
        if num > 0:
            result.append(num)
    return result`;

      const result = analyzeSpaceComplexity(pythonCode);

      expect(result.notation).toBe("O(n)");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid code gracefully", () => {
      const invalidCode = "def invalid_syntax(";

      const result = analyzeSpaceComplexity(invalidCode);

      expect(result.notation).toBe("O(1)");
      expect(result.description).toContain("Error in analysis");
    });

    test("should handle empty code", () => {
      const emptyCode = "";

      const result = analyzeSpaceComplexity(emptyCode);

      expect(result.notation).toBe("O(1)");
      expect(result.confidence).toBeGreaterThanOrEqual(50);
    });
  });
});
