import { analyzeCodeComplexity } from "../../analysis/complexityAnalyzer";
import { analyzeSpaceComplexity } from "../../analysis/spaceAnalyzer";
import { getComplexityIndicator } from "../../utils/complexityHelperUtils";

describe("GOOD Complexity - O(log n) and O(n)", () => {
  describe("O(log n) Logarithmic Time", () => {
    test("should correctly identify O(log n) binary search", () => {
      const pythonCode = `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("binary_search");
      expect(result.methods[0].complexity.notation).toBe("O(log n)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(
        70
      );
    });

    test("should rate O(log n) complexity as GOOD", () => {
      const rating = getComplexityIndicator("O(log n)");
      expect(rating).toBe("GOOD");
    });

    test("should identify tree traversal as O(log n)", () => {
      const pythonCode = `def find_in_bst(root, target):
    """Find value in BST - O(log n)"""
    while root:
        if root.val == target:
            return True
        elif target < root.val:
            root = root.left
        else:
            root = root.right
    return False`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(log n)");
    });

    test("should identify bracket matching as O(log n)", () => {
      const pythonCode = `def find_matching_bracket(text, pos):
    """Find matching bracket - O(log n)"""
    count = 1
    i = pos + 1
    while i < len(text) and count > 0:
        if text[i] == '(':
            count += 1
        elif text[i] == ')':
            count -= 1
        i += 1
    return i - 1 if count == 0 else -1`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(log n)");
    });

    test("should identify tree height calculation as O(log n)", () => {
      const pythonCode = `def tree_height_calculation(n):
    # Height of balanced binary tree with n nodes
    import math
    return math.ceil(math.log2(n + 1))`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(log n)");
    });

    test("should identify heap operations as O(log n)", () => {
      const pythonCode = `def heap_operations(arr):
    import heapq
    heap = []
    heapq.heappush(heap, arr[0])  # O(log n)
    return heapq.heappop(heap)    # O(log n)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(log n)");
    });

    test("should identify bit counting as O(log n)", () => {
      const pythonCode = `def count_bits(n):
    count = 0
    while n:
        count += 1
        n //= 2  # Dividing by 2 each time = O(log n)
    return count`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(log n)");
    });
  });

  describe("O(n) Linear Time", () => {
    test("should correctly identify O(n) linear search", () => {
      const pythonCode = `def linear_search(arr, target):
    for i, value in enumerate(arr):
        if value == target:
            return i
    return -1`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("linear_search");
      expect(result.methods[0].complexity.notation).toBe("O(n)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(
        70
      );
    });

    test("should correctly identify O(n) space complexity", () => {
      const pythonCode = `def create_copy(arr):
    result = []
    for item in arr:
        result.append(item)
    return result`;

      const lines = pythonCode.split("\n");
      const result = analyzeSpaceComplexity(lines);

      expect(result.notation).toBe("O(n)");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should rate O(n) complexity as GOOD", () => {
      const rating = getComplexityIndicator("O(n)");
      expect(rating).toBe("GOOD");
    });

    test("should identify cyclomatic complexity calculation as O(n)", () => {
      const pythonCode = `def calculate_cyclomatic_complexity(code_lines):
    """Calculate complexity - O(n)"""
    complexity = 1
    for line in code_lines:
        line = line.strip()
        if any(keyword in line for keyword in ['if', 'elif', 'for', 'while', 'try', 'except']):
            complexity += 1
    return complexity`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify list comprehensions as O(n)", () => {
      const pythonCode = `def filter_numbers(arr):
    """Filter numbers - O(n)"""
    return [x for x in arr if isinstance(x, int)]`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify file processing as O(n)", () => {
      const pythonCode = `def count_lines(file_content):
    """Count lines in file - O(n)"""
    count = 0
    for line in file_content.split('\\n'):
        if line.strip():
            count += 1
    return count`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify sum operation as O(n)", () => {
      const pythonCode = `def calculate_sum(numbers):
    """Calculate sum - O(n)"""
    total = 0
    for num in numbers:
        total += num
    return total`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify max finding as O(n)", () => {
      const pythonCode = `def find_maximum(arr):
    """Find maximum element - O(n)"""
    if not arr:
        return None
    max_val = arr[0]
    for val in arr[1:]:
        if val > max_val:
            max_val = val
    return max_val`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify string building as O(n)", () => {
      const pythonCode = `def build_html(items):
    """Build HTML list - O(n)"""
    html = "<ul>"
    for item in items:
        html += f"<li>{item}</li>"
    html += "</ul>"
    return html`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify find_max as O(n)", () => {
      const pythonCode = `def find_max(arr):
    """Find maximum value in array - O(n) time, O(1) space"""
    if not arr:
        return None
    max_val = arr[0]
    for num in arr:  # O(n)
        if num > max_val:
            max_val = num
    return max_val`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify count_characters as O(n)", () => {
      const pythonCode = `def count_characters(text):
    """Count character frequency - O(n) time, O(1) space"""
    count = {}
    for char in text:  # O(n)
        count[char] = count.get(char, 0) + 1
    return count`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify array_operations as O(n)", () => {
      const pythonCode = `def array_operations(arr):
    """Array operations - O(n) time, O(1) space"""
    # Most list operations are O(n)
    return sum(arr), len(arr), list(reversed(arr))`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify array processing as O(n)", () => {
      const pythonCode = `def process_all_elements(arr):
    """Process all elements - O(n) time, O(1) space"""
    total = 0
    for element in arr:  # O(n) - clearly linear
        total += element * 2
    return total`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });
  });
});
