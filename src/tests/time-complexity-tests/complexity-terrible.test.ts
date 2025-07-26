import { analyzeCodeComplexity } from "../../analysis/complexityAnalyzer";
import { getComplexityIndicator } from "../../utils/complexityHelperUtils";

describe("TERRIBLE Complexity - O(2^n) and O(n!) Factorial Time", () => {
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

    test("should rate O(2^n) complexity as BAD", () => {
      const rating = getComplexityIndicator("O(2^n)");
      expect(rating).toBe("BAD");
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

    test("should identify all_permutations using itertools as O(n!)", () => {
      const pythonCode = `def all_permutations(arr):
    """Generate all permutations using itertools - O(n!)"""
    from itertools import permutations
    return list(permutations(arr))`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should identify traveling_salesman_bruteforce as O(n!)", () => {
      const pythonCode = `def traveling_salesman_bruteforce(cities, distances):
    """Traveling Salesman Problem brute force - O(n!)"""
    from itertools import permutations
    n = len(cities)
    min_cost = float('inf')
    best_route = None
    
    # Try all possible permutations
    for perm in permutations(range(1, n)):  # O(n!)
        route = [0] + list(perm) + [0]
        cost = 0
        for i in range(len(route) - 1):
            cost += distances[route[i]][route[i + 1]]
        
        if cost < min_cost:
            min_cost = cost
            best_route = route
    
    return best_route, min_cost`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should identify n_queens_all_solutions as O(n!)", () => {
      const pythonCode = `def n_queens_all_solutions(n):
    """N-Queens problem returning all solutions - O(n!)"""
    def is_safe(board, row, col):
        # Check column
        for i in range(row):
            if board[i] == col:
                return False
        
        # Check diagonals
        for i in range(row):
            if abs(board[i] - col) == abs(i - row):
                return False
        return True
    
    def solve(board, row):
        if row == n:
            return [board[:]]
        
        solutions = []
        for col in range(n):
            if is_safe(board, row, col):
                board[row] = col
                solutions.extend(solve(board, row + 1))
                board[row] = -1
        return solutions
    
    return solve([-1] * n, 0)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should identify generate_all_passwords as O(n!)", () => {
      const pythonCode = `def generate_all_passwords(characters, length):
    """Generate all possible passwords - O(n!)"""
    if length == 0:
        return [""]
    
    passwords = []
    for shorter in generate_all_passwords(characters, length - 1):
        for char in characters:
            passwords.append(shorter + char)
    return passwords`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(n!)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
    });
  });

  describe("O(2^n) Exponential Patterns", () => {
    test("should identify k-way merge sort as O(n log n)", () => {
      const pythonCode = `def k_way_merge_sort(arr, k=3):
    """K-way merge sort - O(n log n)"""
    if len(arr) <= 1:
        return arr
    
    # Split into k parts recursively
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
      expect(result.methods[0].complexity.notation).toBe("O(n log n)");
    });

    test("should identify fibonacci recursion as O(2^n)", () => {
      const pythonCode = `def fibonacci(n):
    """Classic fibonacci with exponential time - O(2^n)"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });

    test("should identify subset generation as O(2^n)", () => {
      const pythonCode = `def generate_subsets(arr):
    """Generate all subsets - O(2^n)"""
    if not arr:
        return [[]]
    
    first = arr[0]
    rest = arr[1:]
    
    subsets_without = generate_subsets(rest)
    subsets_with = generate_subsets(rest)
    
    # Add first element to each subset
    result = subsets_without[:]
    for subset in subsets_with:
        result.append([first] + subset)
    
    return result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });

    test("should identify tower of hanoi as O(2^n)", () => {
      const pythonCode = `def tower_of_hanoi(n, source, destination, auxiliary):
    """Tower of Hanoi - O(2^n)"""
    if n == 1:
        print(f"Move disk 1 from {source} to {destination}")
        return
    
    tower_of_hanoi(n-1, source, auxiliary, destination)
    print(f"Move disk {n} from {source} to {destination}")
    tower_of_hanoi(n-1, auxiliary, destination, source)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
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

    test("should identify binary tree path enumeration as O(2^n)", () => {
      const pythonCode = `def find_all_paths(root):
    """Find all paths in binary tree - O(2^n)"""
    if not root:
        return []
    
    if not root.left and not root.right:
        return [[root.val]]
    
    paths = []
    
    # Exponential branching - explore both subtrees
    left_paths = find_all_paths(root.left)
    right_paths = find_all_paths(root.right)
    
    for path in left_paths:
        paths.append([root.val] + path)
    for path in right_paths:
        paths.append([root.val] + path)
    
    return paths`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });

    test("should identify boolean formula evaluation as O(2^n)", () => {
      const pythonCode = `def evaluate_boolean_formula(formula, assignment):
    """Evaluate boolean formula - O(2^n)"""
    if not formula:
        return True
    
    # Boolean evaluation with recursive branching
    if formula.type == "AND":
        left_result = evaluate_boolean_formula(formula.left, assignment)
        right_result = evaluate_boolean_formula(formula.right, assignment)
        return left_result and right_result
    elif formula.type == "OR":
        left_result = evaluate_boolean_formula(formula.left, assignment)
        right_result = evaluate_boolean_formula(formula.right, assignment)
        return left_result or right_result
    else:
        return assignment.get(formula.variable, False)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });
  });
});
