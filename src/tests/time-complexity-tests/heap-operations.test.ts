import { analyzeCodeComplexity } from "../../analysis/complexityAnalyzer";

describe("Individual Heap Operations - O(log n)", () => {
  test("should identify individual heap operations as O(log n)", () => {
    const pythonCode = `import heapq

def heap_operations(arr):
    heap = []
    heapq.heappush(heap, arr[0])  # O(log n)
    return heapq.heappop(heap)    # O(log n)`;

    const result = analyzeCodeComplexity(pythonCode);
    
    // Defensive programming: check if methods array exists and has content
    expect(result).toBeDefined();
    expect(result.methods).toBeDefined();
    expect(result.methods.length).toBeGreaterThan(0);
    
    console.log(
      "Heap operations test result:",
      JSON.stringify(result.methods[0].complexity, null, 2)
    );
    expect(result.methods[0].complexity.notation).toBe("O(log n)");
  });

  test("should identify single heap push as O(log n)", () => {
    const pythonCode = `import heapq

def single_heap_push(heap, item):
    heapq.heappush(heap, item)`;

    const result = analyzeCodeComplexity(pythonCode);
    
    // Defensive programming: check if methods array exists and has content
    expect(result).toBeDefined();
    expect(result.methods).toBeDefined();
    expect(result.methods.length).toBeGreaterThan(0);
    
    console.log(
      "Single heap push result:",
      JSON.stringify(result.methods[0].complexity, null, 2)
    );
    expect(result.methods[0].complexity.notation).toBe("O(log n)");
  });

  test("should identify single heap pop as O(log n)", () => {
    const pythonCode = `import heapq

def single_heap_pop(heap):
    return heapq.heappop(heap)`;

    const result = analyzeCodeComplexity(pythonCode);
    
    // Defensive programming: check if methods array exists and has content
    expect(result).toBeDefined();
    expect(result.methods).toBeDefined();
    expect(result.methods.length).toBeGreaterThan(0);
    
    console.log(
      "Single heap pop result:",
      JSON.stringify(result.methods[0].complexity, null, 2)
    );
    expect(result.methods[0].complexity.notation).toBe("O(log n)");
  });
});
