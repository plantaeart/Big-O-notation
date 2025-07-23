import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import { getComplexityIndicator } from "../utils/complexityHelperUtils";

describe("POOR Complexity - O(n²) and O(n³)", () => {
  describe("O(n²) Quadratic Time", () => {
    test("should correctly identify O(n²) bubble sort", () => {
      const pythonCode = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("bubble_sort");
      expect(result.methods[0].complexity.notation).toBe("O(n²)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(
        70
      );
    });

    test("should rate O(n²) complexity as POOR", () => {
      const rating = getComplexityIndicator("O(n²)");
      expect(rating).toBe("POOR");
    });

    test("should rate O(n³) complexity as POOR", () => {
      const rating = getComplexityIndicator("O(n³)");
      expect(rating).toBe("POOR");
    });

    test("should identify matrix operations as O(n²)", () => {
      const pythonCode = `def matrix_add(matrix1, matrix2):
    """Add two matrices - O(n²)"""
    rows = len(matrix1)
    cols = len(matrix1[0])
    result = [[0] * cols for _ in range(rows)]
    
    for i in range(rows):
        for j in range(cols):
            result[i][j] = matrix1[i][j] + matrix2[i][j]
    
    return result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n²)");
    });

    test("should identify code similarity calculation as O(n²)", () => {
      const pythonCode = `def calculate_similarity_matrix(functions):
    """Calculate similarity between all function pairs - O(n²)"""
    n = len(functions)
    similarity_matrix = [[0.0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i != j:
                similarity_matrix[i][j] = calculate_similarity(functions[i], functions[j])
            else:
                similarity_matrix[i][j] = 1.0
    
    return similarity_matrix

def calculate_similarity(func1, func2):
    # Simple similarity calculation
    return len(set(func1) & set(func2)) / len(set(func1) | set(func2))`;

      const result = analyzeCodeComplexity(pythonCode);
      const similarityMethod = result.methods.find(
        (m) => m.name === "calculate_similarity_matrix"
      );
      expect(similarityMethod).toBeDefined();
      expect(similarityMethod!.complexity.notation).toBe("O(n²)");
    });

    test("should identify nested loop patterns as O(n²)", () => {
      const pythonCode = `def find_duplicates(arr):
    """Find all duplicate pairs - O(n²)"""
    duplicates = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j]:
                duplicates.append((i, j))
    return duplicates`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n²)");
    });

    test("should identify selection sort as O(n²)", () => {
      const pythonCode = `def selection_sort(arr):
    """Selection sort - O(n²)"""
    for i in range(len(arr)):
        min_idx = i
        for j in range(i + 1, len(arr)):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n²)");
    });

    test("should identify insertion sort as O(n²)", () => {
      const pythonCode = `def insertion_sort(arr):
    """Insertion sort - O(n²)"""
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n²)");
    });
  });

  describe("O(n³) Cubic Time", () => {
    test("should correctly identify O(n³) matrix multiplication", () => {
      const pythonCode = `def matrix_multiply(A, B):
    """Matrix multiplication - O(n³)"""
    n = len(A)
    result = [[0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            for k in range(n):
                result[i][j] += A[i][k] * B[k][j]
    
    return result`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("matrix_multiply");
      expect(result.methods[0].complexity.notation).toBe("O(n³)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(
        70
      );
    });

    test("should identify triple nested loops as O(n³)", () => {
      const pythonCode = `def find_triplets(arr, target):
    """Find all triplets that sum to target - O(n³)"""
    triplets = []
    n = len(arr)
    
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if arr[i] + arr[j] + arr[k] == target:
                    triplets.append((arr[i], arr[j], arr[k]))
    
    return triplets`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n³)");
    });

    test("should identify 3D matrix operations as O(n³)", () => {
      const pythonCode = `def process_3d_matrix(matrix):
    """Process 3D matrix - O(n³)"""
    result = 0
    for i in range(len(matrix)):
        for j in range(len(matrix[0])):
            for k in range(len(matrix[0][0])):
                result += matrix[i][j][k]
    return result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n³)");
    });
  });

  describe("False Positive Prevention", () => {
    test("should NOT identify constant inner loop as O(n²)", () => {
      const pythonCode = `def process_with_keywords(code_lines):
    """Process code lines with keywords - O(n)"""
    keywords = ['if', 'for', 'while', 'def', 'class']  # Constant size
    results = []
    
    for line in code_lines:
        for keyword in keywords:  # This is O(1) since keywords is constant
            if keyword in line:
                results.append((line, keyword))
                break
    
    return results`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should distinguish matrix operations from constant collections", () => {
      const pythonCode = `def check_syntax_errors(lines):
    """Check for syntax errors - O(n)"""
    error_patterns = ['SyntaxError', 'IndentationError', 'NameError']  # Constant
    errors = []
    
    for line in lines:
        for pattern in error_patterns:  # O(1) - constant patterns
            if pattern in line:
                errors.append(line)
                break
    
    return errors`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });
  });
});
