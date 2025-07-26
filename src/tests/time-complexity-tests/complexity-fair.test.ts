import { analyzeCodeComplexity } from "../../analysis/complexityAnalyzer";
import { getComplexityIndicator } from "../../utils/complexityHelperUtils";

describe("FAIR Complexity - O(n log n) Linearithmic Time", () => {
  describe("Sorting Algorithms", () => {
    test("should correctly identify O(n log n) merge sort", () => {
      const pythonCode = `def merge_sort(arr):
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
    return result`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(2);
      const mergeSortMethod = result.methods.find(
        (m) => m.name === "merge_sort"
      );
      expect(mergeSortMethod).toBeDefined();
      expect(mergeSortMethod!.complexity.notation).toBe("O(n log n)");
      expect(mergeSortMethod!.complexity.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should rate O(n log n) complexity as FAIR", () => {
      const rating = getComplexityIndicator("O(n log n)");
      expect(rating).toBe("FAIR");
    });

    test("should identify built-in sorting as O(n log n)", () => {
      const pythonCode = `def sort_array(arr):
    """Sort array using built-in sort - O(n log n)"""
    return sorted(arr)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify quick sort as O(n log n)", () => {
      const pythonCode = `def quick_sort(arr):
    """Quick sort implementation - O(n log n)"""
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify heap sort as O(n log n)", () => {
      const pythonCode = `def heap_sort(arr):
    """Heap sort implementation - O(n log n)"""
    import heapq
    heap = arr[:]
    heapq.heapify(heap)
    result = []
    while heap:
        result.append(heapq.heappop(heap))
    return result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify heap sort with list comprehension as O(n log n)", () => {
      const pythonCode = `def heap_sort_comprehension(arr):
    """Heap sort with list comprehension - O(n log n)"""
    import heapq
    heap = arr[:]
    heapq.heapify(heap)
    return [heapq.heappop(heap) for _ in range(len(heap))]`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify heap sort with in-place heapify as O(n log n)", () => {
      const pythonCode = `def heap_sort(arr):
    """Heap sort with in-place heapify - O(n log n)"""
    import heapq
    heapq.heapify(arr)  # O(n)
    return [heapq.heappop(arr) for _ in range(len(arr))]  # O(n log n)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify python built-in sort as O(n log n)", () => {
      const pythonCode = `def python_sort(arr):
    """Python built-in sort - O(n log n)"""
    return sorted(arr)  # Timsort - O(n log n)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });
  });

  describe("VSCode Extension O(n log n) Patterns", () => {
    test("should identify suggestion ranking as O(n log n)", () => {
      const pythonCode = `def rank_suggestions(suggestions, user_input):
    """Rank suggestions by relevance - O(n log n)"""
    def calculate_relevance(suggestion):
        return len(set(suggestion.lower()) & set(user_input.lower()))
    
    return sorted(suggestions, key=calculate_relevance, reverse=True)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify error sorting as O(n log n)", () => {
      const pythonCode = `def sort_diagnostics(diagnostics):
    """Sort diagnostics by severity and line number - O(n log n)"""
    return sorted(diagnostics, key=lambda d: (d.severity, d.line_number))`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify file sorting as O(n log n)", () => {
      const pythonCode = `def sort_files_by_complexity(files):
    """Sort files by complexity score - O(n log n)"""
    def get_complexity_score(file_info):
        return file_info.get('complexity_score', 0)
    
    return sorted(files, key=get_complexity_score, reverse=True)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify sorting with complex key as O(n log n)", () => {
      const pythonCode = `def sort_by_multiple_criteria(items):
    """Sort by multiple criteria - O(n log n)"""
    return sorted(items, key=lambda x: (x.priority, -x.timestamp, x.name))`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });
  });

  describe("Divide and Conquer Algorithms", () => {
    test("should identify divide and conquer pattern as O(n log n)", () => {
      const pythonCode = `def divide_and_conquer_search(arr, target):
    """Divide and conquer search - O(n log n)"""
    if len(arr) <= 1:
        return arr[0] == target if arr else False
    
    mid = len(arr) // 2
    left_result = divide_and_conquer_search(arr[:mid], target)
    right_result = divide_and_conquer_search(arr[mid:], target)
    
    return left_result or right_result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });
  });

  describe("Complex Sorting in Nested Functions", () => {
    test("should identify sorting in nested functions as O(n log n)", () => {
      const pythonCode = `def analyze_functions(code_blocks):
    """Analyze functions with sorting - O(n log n)"""
    results = []
    
    def process_block(block):
        lines = block.split('\\n')
        complexity_scores = [len(line) for line in lines]
        return sorted(complexity_scores)  # This makes it O(n log n)
    
    for block in code_blocks:
        results.append(process_block(block))
    
    return results`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });
  });
});
