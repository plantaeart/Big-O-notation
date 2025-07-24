import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";

describe("Function Hierarchy Analysis", () => {
  describe("Merge Sort with Merge Function", () => {
    test("should detect O(n log n) for merge_sort calling O(n) merge function", () => {
      const code = `
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
`;

      const result = analyzeCodeComplexity(code);

      // Should find both functions
      expect(result.methods).toHaveLength(2);

      // Find merge_sort and merge functions
      const mergeSort = result.methods.find((m) => m.name === "merge_sort");
      const merge = result.methods.find((m) => m.name === "merge");

      expect(mergeSort).toBeDefined();
      expect(merge).toBeDefined();

      // Verify complexities
      expect(mergeSort!.complexity.notation).toBe("O(n log n)");
      expect(merge!.complexity.notation).toBe("O(n)");

      // Verify call hierarchy
      expect(result.hierarchy).toBeDefined();
      expect(result.hierarchy!.get("merge_sort")).toEqual(["merge"]);
      expect(result.hierarchy!.get("merge")).toEqual([]);

      // Verify confidence levels
      expect(mergeSort!.complexity.confidence).toBeGreaterThan(80);
      expect(merge!.complexity.confidence).toBeGreaterThan(60);
    });

    test("should detect merge function as O(n) with while loop", () => {
      const code = `
def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
`;

      const result = analyzeCodeComplexity(code);

      expect(result.methods).toHaveLength(1);
      const merge = result.methods[0];

      expect(merge.name).toBe("merge");
      expect(merge.complexity.notation).toBe("O(n)");
      expect(merge.complexity.description).toContain("Single loop");
    });
  });

  describe("Complex Function Hierarchies", () => {
    test("should propagate complexity through multiple call levels", () => {
      const code = `
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = partition(arr)
    left = quick_sort(arr[:pivot])
    right = quick_sort(arr[pivot+1:])
    return left + [arr[pivot]] + right

def partition(arr):
    pivot = arr[-1]
    i = 0
    for j in range(len(arr) - 1):
        if arr[j] <= pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[-1] = arr[-1], arr[i]
    return i

def helper_function():
    return 42
`;

      const result = analyzeCodeComplexity(code);

      expect(result.methods).toHaveLength(3);

      const quickSort = result.methods.find((m) => m.name === "quick_sort");
      const partition = result.methods.find((m) => m.name === "partition");
      const helper = result.methods.find((m) => m.name === "helper_function");

      expect(quickSort).toBeDefined();
      expect(partition).toBeDefined();
      expect(helper).toBeDefined();

      // Quick sort should be O(n log n) or O(n²) depending on implementation details
      expect(["O(n log n)", "O(n²)"]).toContain(quickSort!.complexity.notation);

      // Partition should be O(n)
      expect(partition!.complexity.notation).toBe("O(n)");

      // Helper should be O(1)
      expect(helper!.complexity.notation).toBe("O(1)");

      // Verify call hierarchy
      expect(result.hierarchy!.get("quick_sort")).toContain("partition");
      expect(result.hierarchy!.get("partition")).toEqual([]);
    });

    test("should handle functions with no calls", () => {
      const code = `
def standalone_linear(arr):
    total = 0
    for item in arr:
        total += item
    return total

def standalone_constant():
    return 42
`;

      const result = analyzeCodeComplexity(code);

      expect(result.methods).toHaveLength(2);

      const linear = result.methods.find((m) => m.name === "standalone_linear");
      const constant = result.methods.find(
        (m) => m.name === "standalone_constant"
      );

      expect(linear!.complexity.notation).toBe("O(n)");
      expect(constant!.complexity.notation).toBe("O(1)");

      // Both should have empty call lists
      expect(result.hierarchy!.get("standalone_linear")).toEqual([]);
      expect(result.hierarchy!.get("standalone_constant")).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    test("should handle circular dependencies gracefully", () => {
      const code = `
def function_a(n):
    if n <= 0:
        return 1
    return function_b(n - 1)

def function_b(n):
    if n <= 0:
        return 1
    return function_a(n - 1)
`;

      const result = analyzeCodeComplexity(code);

      expect(result.methods).toHaveLength(2);

      // Should not crash and should assign reasonable complexities
      const funcA = result.methods.find((m) => m.name === "function_a");
      const funcB = result.methods.find((m) => m.name === "function_b");

      expect(funcA).toBeDefined();
      expect(funcB).toBeDefined();
      expect(funcA!.complexity.notation).toBeDefined();
      expect(funcB!.complexity.notation).toBeDefined();
    });

    test("should handle unknown function calls", () => {
      const code = `
def my_function(arr):
    result = some_unknown_function(arr)
    for item in arr:
        result.append(item * 2)
    return result
`;

      const result = analyzeCodeComplexity(code);

      expect(result.methods).toHaveLength(1);
      const func = result.methods[0];

      expect(func.name).toBe("my_function");
      expect(func.complexity.notation).toBe("O(n)"); // Based on the for loop

      // Unknown functions should not appear in hierarchy
      expect(result.hierarchy!.get("my_function")).toEqual([]);
    });

    test("should handle empty code", () => {
      const code = "";

      const result = analyzeCodeComplexity(code);

      expect(result.methods).toHaveLength(0);
      expect(result.hierarchy!.size).toBe(0);
    });

    test("should handle malformed code gracefully", () => {
      const code = `
def incomplete_function(
    # Missing closing parenthesis and body
`;

      const result = analyzeCodeComplexity(code);

      // Should not crash
      expect(result).toBeDefined();
      expect(result.methods).toBeDefined();
      expect(result.hierarchy).toBeDefined();
    });
  });

  describe("Confidence and Description Validation", () => {
    test("should provide reasonable confidence levels", () => {
      const code = `
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
`;

      const result = analyzeCodeComplexity(code);

      for (const method of result.methods) {
        // All confidence levels should be between 0 and 100
        expect(method.complexity.confidence).toBeGreaterThanOrEqual(0);
        expect(method.complexity.confidence).toBeLessThanOrEqual(100);

        // Should have meaningful descriptions
        expect(method.complexity.description).toBeDefined();
        expect(method.complexity.description.length).toBeGreaterThan(0);
      }
    });

    test("should include call information in descriptions for propagated complexities", () => {
      const code = `
def parent_function(arr):
    return child_function(arr)

def child_function(arr):
    for item in arr:
        print(item)
    return arr
`;

      const result = analyzeCodeComplexity(code);

      const parent = result.methods.find((m) => m.name === "parent_function");
      const child = result.methods.find((m) => m.name === "child_function");

      expect(parent).toBeDefined();
      expect(child).toBeDefined();

      // If parent complexity is propagated, description should mention the child function
      if (
        parent!.complexity.notation === child!.complexity.notation &&
        parent!.complexity.notation === "O(n)"
      ) {
        expect(parent!.complexity.description).toContain("child_function");
      }
    });
  });

  describe("Performance with Large Hierarchies", () => {
    test("should handle multiple functions efficiently", () => {
      // Generate code with many functions
      let code = "";
      for (let i = 0; i < 10; i++) {
        code += `
def function_${i}(arr):
    total = 0
    for item in arr:
        total += item
    return total
`;
      }

      const startTime = Date.now();
      const result = analyzeCodeComplexity(code);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // Should find all functions
      expect(result.methods).toHaveLength(10);

      // All should be correctly classified as O(n)
      for (const method of result.methods) {
        expect(method.complexity.notation).toBe("O(n)");
      }
    });
  });
});
