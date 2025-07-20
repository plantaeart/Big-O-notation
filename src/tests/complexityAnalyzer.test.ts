import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";

describe("Complexity Analyzer", () => {
  test("should analyze O(1) complexity correctly", () => {
    const code = `def get_first_element(arr):
    return arr[0]`;

    const result = analyzeCodeComplexity(code);

    expect(result.methods).toHaveLength(1);
    expect(result.methods[0].name).toBe("get_first_element");
    expect(result.methods[0].complexity.notation).toBe("O(1)");
  });

  test("should analyze O(n) complexity correctly", () => {
    const code = `def linear_search(arr, target):
    for item in arr:
        if item == target:
            return True
    return False`;

    const result = analyzeCodeComplexity(code);

    expect(result.methods).toHaveLength(1);
    expect(result.methods[0].name).toBe("linear_search");
    expect(result.methods[0].complexity.notation).toBe("O(n)");
  });

  test("should analyze O(n²) complexity correctly", () => {
    const code = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]`;

    const result = analyzeCodeComplexity(code);

    expect(result.methods).toHaveLength(1);
    expect(result.methods[0].name).toBe("bubble_sort");
    expect(result.methods[0].complexity.notation).toBe("O(n²)");
  });

  test("should detect async functions", () => {
    const code = `async def fetch_data():
    return await api.get_data()`;

    const result = analyzeCodeComplexity(code);

    expect(result.methods).toHaveLength(1);
    expect(result.methods[0].name).toBe("fetch_data");
  });
});
