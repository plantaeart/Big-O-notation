import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";

describe("Array Operations Test", () => {
  test("should identify array operations as O(n) not O(1)", () => {
    const pythonCode = `def array_operations(arr):
    # Most list operations are O(n)
    return sum(arr), len(arr), list(reversed(arr))`;

    const result = analyzeCodeComplexity(pythonCode);
    console.log("Test result:", result.methods[0]);

    // This should be O(n) because of sum() and reversed()
    // len() is O(1) but sum() and reversed() are O(n)
    expect(result.methods[0].complexity.notation).toBe("O(n)");
  });

  test("should identify pure len() as O(1)", () => {
    const pythonCode = `def get_length(arr):
    return len(arr)`;

    const result = analyzeCodeComplexity(pythonCode);
    console.log("Len only result:", result.methods[0]);

    // This should be O(1) because len() is O(1) in Python
    expect(result.methods[0].complexity.notation).toBe("O(1)");
  });

  test("should identify sum() as O(n)", () => {
    const pythonCode = `def calculate_sum(arr):
    return sum(arr)`;

    const result = analyzeCodeComplexity(pythonCode);
    console.log("Sum only result:", result.methods[0]);

    // This should be O(n) because sum() iterates through all elements
    expect(result.methods[0].complexity.notation).toBe("O(n)");
  });
});
