import { analyzeCodeComplexity } from "../../analysis/complexityAnalyzer";
import { getComplexityIndicator } from "../../utils/complexityHelperUtils";

describe("BAD Complexity - O(2^n) Exponential Time", () => {
  describe("Recursive Exponential Patterns", () => {
    test("should correctly identify O(2^n) fibonacci", () => {
      const pythonCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("fibonacci");
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(
        70
      );
    });

    test("should rate O(2^n) complexity as BAD", () => {
      const rating = getComplexityIndicator("O(2^n)");
      expect(rating).toBe("BAD");
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

    test("should identify subset generation as O(2^n)", () => {
      const pythonCode = `def generate_subsets(arr):
    """Generate all subsets - O(2^n)"""
    if not arr:
        return [[]]
    
    first = arr[0]
    rest_subsets = generate_subsets(arr[1:])
    
    # For each subset of rest, create two versions: with and without first element
    result = []
    for subset in rest_subsets:
        result.append(subset)  # Without first element
        result.append([first] + subset)  # With first element
    
    return result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });

    test("should identify boolean formula evaluation as O(2^n)", () => {
      const pythonCode = `def evaluate_all_assignments(formula, variables):
    """Evaluate formula for all variable assignments - O(2^n)"""
    if not variables:
        return [evaluate_formula(formula, {})]
    
    var = variables[0]
    rest_vars = variables[1:]
    
    # Try both True and False for current variable
    results_true = evaluate_all_assignments(formula, rest_vars)
    results_false = evaluate_all_assignments(formula, rest_vars)
    
    return results_true + results_false

def evaluate_formula(formula, assignment):
    # Simplified formula evaluation
    return True`;

      const result = analyzeCodeComplexity(pythonCode);
      const evalMethod = result.methods.find(
        (m) => m.name === "evaluate_all_assignments"
      );
      expect(evalMethod).toBeDefined();
      expect(evalMethod!.complexity.notation).toBe("O(2^n)");
    });
  });

  describe("Combinatorial Exponential Algorithms", () => {
    test("should identify power set generation as O(2^n)", () => {
      const pythonCode = `def power_set(s):
    """Generate power set - O(2^n)"""
    if not s:
        return [set()]
    
    elem = s.pop()
    power_set_without_elem = power_set(s)
    power_set_with_elem = [subset | {elem} for subset in power_set_without_elem]
    
    return power_set_without_elem + power_set_with_elem`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });

    test("should identify backtracking without memoization as O(2^n)", () => {
      const pythonCode = `def solve_maze(maze, x, y, path):
    """Solve maze using backtracking - O(2^n)"""
    if x == len(maze) - 1 and y == len(maze[0]) - 1:
        return True
    
    if x < 0 or x >= len(maze) or y < 0 or y >= len(maze[0]) or maze[x][y] == 0:
        return False
    
    # Mark as visited
    maze[x][y] = 0
    
    # Try all four directions
    if (solve_maze(maze, x+1, y, path) or 
        solve_maze(maze, x-1, y, path) or
        solve_maze(maze, x, y+1, path) or
        solve_maze(maze, x, y-1, path)):
        path.append((x, y))
        return True
    
    # Backtrack
    maze[x][y] = 1
    return False`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });

    test("should identify binary tree all paths as O(2^n)", () => {
      const pythonCode = `def all_root_to_leaf_paths(root):
    """Find all root-to-leaf paths - O(2^n)"""
    if not root:
        return []
    
    if not root.left and not root.right:
        return [[root.val]]
    
    paths = []
    
    if root.left:
        left_paths = all_root_to_leaf_paths(root.left)
        paths.extend([[root.val] + path for path in left_paths])
    
    if root.right:
        right_paths = all_root_to_leaf_paths(root.right)
        paths.extend([[root.val] + path for path in right_paths])
    
    return paths`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });
  });

  describe("Search and Optimization Exponential", () => {
    test("should identify exhaustive search as O(2^n)", () => {
      const pythonCode = `def knapsack_brute_force(weights, values, capacity):
    """Knapsack problem brute force - O(2^n)"""
    n = len(weights)
    
    def helper(index, current_weight, current_value):
        if index == n:
            return current_value if current_weight <= capacity else 0
        
        # Two choices: include or exclude current item
        exclude = helper(index + 1, current_weight, current_value)
        include = helper(index + 1, current_weight + weights[index], current_value + values[index])
        
        return max(include, exclude)
    
    return helper(0, 0, 0)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });

    test("should identify combination sum as O(2^n)", () => {
      const pythonCode = `def combination_sum(candidates, target):
    """Find all combinations that sum to target - O(2^n)"""
    result = []
    
    def backtrack(remaining, combination, start):
        if remaining == 0:
            result.append(combination[:])
            return
        
        for i in range(start, len(candidates)):
            if candidates[i] <= remaining:
                combination.append(candidates[i])
                backtrack(remaining - candidates[i], combination, i)
                combination.pop()
    
    backtrack(target, [], 0)
    return result`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(2^n)");
    });
  });
});
