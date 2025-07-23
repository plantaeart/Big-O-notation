import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import { analyzeSpaceComplexity } from "../analysis/spaceAnalyzer";
import { getComplexityIndicator } from "../utils/complexityHelperUtils";

/**
 * Core Complexity Analysis Tests
 *
 * This file focuses on unique testing scenarios not covered by rating-based tests:
 * - Async function detection and analysis
 * - Complex patterns with multiple functions
 * - Edge cases and error handling
 * - Space complexity analysis
 * - Performance optimization examples
 * - Complexity indicator rating system
 *
 * For Big O notation specific tests, see:
 * - complexity-excellent.test.ts (O(1))
 * - complexity-good.test.ts (O(log n), O(n))
 * - complexity-fair.test.ts (O(n log n))
 * - complexity-poor.test.ts (O(n²), O(n³))
 * - complexity-bad.test.ts (O(2^n))
 * - complexity-terrible.test.ts (O(k^n), O(n!))
 */
describe("Core Complexity Analysis Features", () => {
  describe("Async Function Detection", () => {
    test("should detect both async and sync functions", () => {
      const pythonCode = `async def fetch_data():
    return await api.get_data()  # O(1) operation

def process_data(data):
    for item in data:  # O(n) loop
        print(item)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(2);

      const asyncMethod = result.methods.find((m) => m.name === "fetch_data");
      const syncMethod = result.methods.find((m) => m.name === "process_data");

      expect(asyncMethod).toBeDefined();
      expect(syncMethod).toBeDefined();
      expect(asyncMethod!.complexity.notation).toBe("O(1)");
      expect(syncMethod!.complexity.notation).toBe("O(n)");
    });

    test("should handle async function with loops", () => {
      const pythonCode = `async def async_process_all(items):
    for item in items:
        await process_item(item)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("async_process_all");
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });
  });

  describe("Complex Patterns", () => {
    test("should analyze multiple functions with different complexities", () => {
      const pythonCode = `def constant_operation():
    return 42

def linear_search(arr, target):
    for item in arr:
        if item == target:
            return True
    return False

def nested_loop_operation(n):
    for i in range(n):
        for j in range(n):
            print(i, j)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(3);

      const constant = result.methods.find(
        (m) => m.name === "constant_operation"
      );
      const linear = result.methods.find((m) => m.name === "linear_search");
      const quadratic = result.methods.find(
        (m) => m.name === "nested_loop_operation"
      );

      expect(constant?.complexity.notation).toBe("O(1)");
      expect(linear?.complexity.notation).toBe("O(n)");
      expect(quadratic?.complexity.notation).toBe("O(n²)");
    });

    test("should handle functions with early returns", () => {
      const pythonCode = `def find_first_match(arr, target):
    for item in arr:
        if item == target:
            return item  # Early return
    return None`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty functions", () => {
      const pythonCode = `def empty_function():
    pass`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should handle functions with only comments", () => {
      const pythonCode = `def commented_function():
    # This is just a comment
    # Another comment
    return None`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should handle malformed code gracefully", () => {
      const pythonCode = `def incomplete_function(
    # Missing closing parenthesis and body`;

      // Should not throw an error
      expect(() => analyzeCodeComplexity(pythonCode)).not.toThrow();
    });
  });

  describe("Space Complexity Analysis", () => {
    test("should identify O(1) space complexity", () => {
      const lines = ["def constant_space():", "    x = 5", "    return x * 2"];

      const result = analyzeSpaceComplexity(lines);

      expect(result.notation).toBe("O(1)");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should identify O(n) space complexity for list creation", () => {
      const lines = [
        "def create_list(n):",
        "    result = []",
        "    for i in range(n):",
        "        result.append(i)",
        "    return result",
      ];

      const result = analyzeSpaceComplexity(lines);

      expect(result.notation).toBe("O(n)");
    });
  });

  // Note: VSCode Extension Development Pattern tests have been moved to rating-based test files:
  // - See complexity-excellent.test.ts, complexity-good.test.ts, etc. for specific Big O patterns
  // - This file now focuses on core functionality testing

  describe("Complexity Indicator Ratings", () => {
    test("should return correct ratings for all complexity types", () => {
      expect(getComplexityIndicator("O(1)")).toBe("EXCELLENT");
      expect(getComplexityIndicator("O(log n)")).toBe("GOOD");
      expect(getComplexityIndicator("O(n)")).toBe("GOOD");
      expect(getComplexityIndicator("O(n log n)")).toBe("FAIR");
      expect(getComplexityIndicator("O(n²)")).toBe("POOR");
      expect(getComplexityIndicator("O(2^n)")).toBe("BAD");
      expect(getComplexityIndicator("O(n!)")).toBe("TERRIBLE");
    });

    test("should provide consistent ratings", () => {
      // Test multiple calls return same result
      expect(getComplexityIndicator("O(1)")).toBe("EXCELLENT");
      expect(getComplexityIndicator("O(1)")).toBe("EXCELLENT");
      expect(getComplexityIndicator("O(n²)")).toBe("POOR");
      expect(getComplexityIndicator("O(n²)")).toBe("POOR");
    });
  });
});
