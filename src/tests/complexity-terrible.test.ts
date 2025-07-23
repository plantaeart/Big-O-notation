import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import { getComplexityIndicator } from "../utils/complexityHelperUtils";

describe("TERRIBLE Complexity - O(k^n) and O(n!) Factorial Time", () => {
  describe("O(n!) Factorial Time", () => {
    test("should correctly identify O(n!) permutations", () => {
      const pythonCode = `def generate_permutations(arr):
    if len(arr) <= 1:
        return [arr]
    
    result = []
    for i in range(len(arr)):
        rest = arr[:i] + arr[i+1:]
        for perm in generate_permutations(rest):
            result.append([arr[i]] + perm)
    
    return result`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("generate_permutations");
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(
        70
      );
    });

    test("should rate O(n!) complexity as TERRIBLE", () => {
      const rating = getComplexityIndicator("O(n!)");
      expect(rating).toBe("TERRIBLE");
    });

    test("should rate O(k^n) complexity as TERRIBLE", () => {
      const rating = getComplexityIndicator("O(k^n)");
      expect(rating).toBe("TERRIBLE");
    });

    test("should identify traveling salesman as O(n!)", () => {
      const pythonCode = `def traveling_salesman_brute_force(distances):
    """Traveling Salesman Problem brute force - O(n!)"""
    n = len(distances)
    cities = list(range(1, n))  # Exclude starting city 0
    min_cost = float('inf')
    best_path = None
    
    def calculate_path_cost(path):
        cost = distances[0][path[0]]  # Start to first city
        for i in range(len(path) - 1):
            cost += distances[path[i]][path[i + 1]]
        cost += distances[path[-1]][0]  # Last city back to start
        return cost
    
    # Generate all permutations of cities
    def generate_all_paths(remaining_cities, current_path):
        nonlocal min_cost, best_path
        
        if not remaining_cities:
            cost = calculate_path_cost(current_path)
            if cost < min_cost:
                min_cost = cost
                best_path = current_path[:]
            return
        
        for i, city in enumerate(remaining_cities):
            current_path.append(city)
            generate_all_paths(remaining_cities[:i] + remaining_cities[i+1:], current_path)
            current_path.pop()
    
    generate_all_paths(cities, [])
    return min_cost, best_path`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
    });

    test("should identify N-Queens as O(n!)", () => {
      const pythonCode = `def solve_n_queens(n):
    """N-Queens problem - O(n!)"""
    result = []
    board = [-1] * n
    
    def is_safe(row, col):
        for i in range(row):
            if (board[i] == col or 
                board[i] - i == col - row or 
                board[i] + i == col + row):
                return False
        return True
    
    def solve(row):
        if row == n:
            result.append(board[:])
            return
        
        for col in range(n):
            if is_safe(row, col):
                board[row] = col
                solve(row + 1)
                board[row] = -1
    
    solve(0)
    return result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
    });

    test("should identify all arrangements as O(n!)", () => {
      const pythonCode = `def all_string_permutations(s):
    """Generate all permutations of string - O(n!)"""
    if len(s) <= 1:
        return [s]
    
    permutations = []
    for i in range(len(s)):
        char = s[i]
        remaining = s[:i] + s[i+1:]
        
        for perm in all_string_permutations(remaining):
            permutations.append(char + perm)
    
    return permutations`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
    });
  });

  describe("O(k^n) Exponential with Base k", () => {
    test("should identify k-way recursive calls as O(k^n)", () => {
      const pythonCode = `def k_way_merge_sort(arr, k=3):
    """K-way merge sort with exponential splits - O(k^n)"""
    if len(arr) <= 1:
        return arr
    
    # Split into k parts recursively (exponential)
    chunk_size = max(1, len(arr) // k)
    chunks = []
    
    for i in range(0, len(arr), chunk_size):
        chunk = arr[i:i + chunk_size]
        if chunk:
            chunks.append(k_way_merge_sort(chunk, k))
    
    # Merge all chunks
    return merge_k_arrays(chunks)

def merge_k_arrays(arrays):
    # Simple merge implementation
    result = []
    for arr in arrays:
        result.extend(arr)
    return sorted(result)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(k^n)");
    });

    test("should identify decision tree with k branches as O(k^n)", () => {
      const pythonCode = `def solve_with_k_choices(problem, k=4):
    """Solve problem with k choices at each step - O(k^n)"""
    if is_solved(problem):
        return [problem]
    
    solutions = []
    
    # Try k different approaches at each step
    for choice in range(k):
        new_problem = apply_choice(problem, choice)
        if is_valid(new_problem):
            sub_solutions = solve_with_k_choices(new_problem, k)
            solutions.extend(sub_solutions)
    
    return solutions

def is_solved(problem):
    return len(problem) == 0

def apply_choice(problem, choice):
    return problem[1:]  # Simplified

def is_valid(problem):
    return True`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(k^n)");
    });
  });

  describe("Combinatorial Explosion Patterns", () => {
    test("should identify word break all solutions as O(n!)", () => {
      const pythonCode = `def word_break_all_solutions(s, word_dict):
    """Find all possible word break solutions - O(n!)"""
    result = []
    
    def backtrack(start, path):
        if start == len(s):
            result.append(" ".join(path))
            return
        
        for end in range(start + 1, len(s) + 1):
            word = s[start:end]
            if word in word_dict:
                path.append(word)
                backtrack(end, path)
                path.pop()
    
    backtrack(0, [])
    return result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
    });

    test("should identify sudoku solver as O(k^n)", () => {
      const pythonCode = `def solve_sudoku(board):
    """Solve Sudoku puzzle - O(k^n) where k=9"""
    def is_valid(board, row, col, num):
        # Check row, column, and 3x3 box
        for i in range(9):
            if (board[row][i] == num or 
                board[i][col] == num or
                board[3*(row//3) + i//3][3*(col//3) + i%3] == num):
                return False
        return True
    
    def solve():
        for row in range(9):
            for col in range(9):
                if board[row][col] == 0:
                    for num in range(1, 10):  # Try all 9 numbers
                        if is_valid(board, row, col, num):
                            board[row][col] = num
                            if solve():
                                return True
                            board[row][col] = 0
                    return False
        return True
    
    return solve()`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(k^n)");
    });

    test("should identify graph coloring as O(k^n)", () => {
      const pythonCode = `def graph_coloring(graph, colors):
    """Graph coloring with k colors - O(k^n)"""
    n = len(graph)
    color_assignment = [0] * n
    
    def is_safe(node, color):
        for neighbor in range(n):
            if graph[node][neighbor] and color_assignment[neighbor] == color:
                return False
        return True
    
    def solve(node):
        if node == n:
            return True
        
        for color in range(1, colors + 1):  # Try all k colors
            if is_safe(node, color):
                color_assignment[node] = color
                if solve(node + 1):
                    return True
                color_assignment[node] = 0
        
        return False
    
    return solve(0)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(k^n)");
    });
  });
});
