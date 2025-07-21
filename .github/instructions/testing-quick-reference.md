# Testing & Complexity Analysis Quick Reference

## Jest Testing Commands

```bash
# Run all tests
npm test

# Watch mode for development
npm test -- --watch

# Run specific test file
npm test complexity.test.ts

# Run tests with coverage
npm test -- --coverage

# Compile TypeScript
npm run compile
```

## Test File Structure

```typescript
// Import pattern for all test files
import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import { analyzeSpaceComplexity } from "../analysis/spaceAnalyzer";
import { getComplexityIndicator } from "../utils/complexityHelperUtils";

// Basic test structure
describe("Test Category", () => {
  test("should test specific behavior", () => {
    const pythonCode = `def example_function():
    return "test"`;

    const result = analyzeCodeComplexity(pythonCode);
    expect(result.methods[0].complexity.notation).toBe("O(1)");
  });
});
```

## Complexity Analysis Patterns

### Time Complexity Test Patterns

#### O(1) - Constant Time

```python
# Cache operations
def get_cached_result(cache, key):
    return cache.get(key, None)

# Direct access
def get_first_element(arr):
    return arr[0] if arr else None

# Simple calculations
def calculate_sum(a, b):
    return a + b
```

#### O(log n) - Logarithmic Time

```python
# Binary search
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
```

#### O(n) - Linear Time

```python
# Single loop
def find_max(arr):
    max_val = arr[0]
    for item in arr:
        if item > max_val:
            max_val = item
    return max_val

# List comprehension
def double_all(arr):
    return [x * 2 for x in arr]
```

#### O(n log n) - Linearithmic Time

```python
# Sorting operations
def sort_by_length(words):
    return sorted(words, key=len)

# Merge sort
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)
```

#### O(n²) - Quadratic Time

```python
# Nested loops
def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j]:
                duplicates.append(arr[i])
    return duplicates

# Matrix operations
def matrix_multiply(A, B):
    result = [[0] * len(B[0]) for _ in range(len(A))]
    for i in range(len(A)):
        for j in range(len(B[0])):
            for k in range(len(B)):
                result[i][j] += A[i][k] * B[k][j]
    return result
```

#### O(2^n) - Exponential Time

```python
# Recursive with multiple calls
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate all combinations
def generate_combinations(items):
    if not items:
        return [[]]
    first = items[0]
    rest_combinations = generate_combinations(items[1:])
    return rest_combinations + [[first] + combo for combo in rest_combinations]
```

#### O(n!) - Factorial Time

```python
# Generate all permutations
def generate_permutations(arr):
    if len(arr) <= 1:
        return [arr]

    result = []
    for i in range(len(arr)):
        rest = arr[:i] + arr[i+1:]
        for perm in generate_permutations(rest):
            result.append([arr[i]] + perm)
    return result

# Traveling salesman brute force
def traveling_salesman_brute_force(cities):
    if len(cities) <= 1:
        return cities, 0

    min_distance = float('inf')
    best_route = None

    for perm in generate_permutations(cities[1:]):  # Fix first city
        route = [cities[0]] + perm + [cities[0]]
        distance = calculate_total_distance(route)
        if distance < min_distance:
            min_distance = distance
            best_route = route

    return best_route, min_distance

# All arrangements of n items
def solve_n_queens(n):
    """Solve N-Queens problem - O(n!)"""
    def is_safe(board, row, col):
        for i in range(row):
            if board[i] == col or abs(board[i] - col) == abs(i - row):
                return False
        return True

    def backtrack(board, row):
        if row == n:
            return [board[:]]
        solutions = []
        for col in range(n):
            if is_safe(board, row, col):
                board[row] = col
                solutions.extend(backtrack(board, row + 1))
                board[row] = -1
        return solutions

    return backtrack([-1] * n, 0)
```

### Space Complexity Test Patterns

#### O(1) - Constant Space

```python
def constant_space_operation():
    x = 5
    y = 10
    return x + y
```

#### O(n) - Linear Space (Fixed Bug Pattern)

```python
def create_list(n):
    result = []              # Empty list creation tracked
    for i in range(n):       # Loop context detected
        result.append(i)     # O(n) space pattern recognized
    return result
```

## Test Expectations

### Time Complexity Assertions

```typescript
// Basic complexity check
expect(result.methods[0].complexity.notation).toBe("O(n)");

// Confidence check
expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);

// Function name verification
expect(result.methods[0].name).toBe("function_name");

// Multiple functions
expect(result.methods).toHaveLength(2);
```

### Space Complexity Assertions

```typescript
const lines = pythonCode.split("\n");
const result = analyzeSpaceComplexity(lines);

expect(result.notation).toBe("O(n)");
expect(result.confidence).toBeGreaterThanOrEqual(70);
```

### Complexity Indicator Ratings

```typescript
expect(getComplexityIndicator("O(1)")).toBe("EXCELLENT");
expect(getComplexityIndicator("O(log n)")).toBe("GOOD");
expect(getComplexityIndicator("O(n)")).toBe("GOOD");
expect(getComplexityIndicator("O(n log n)")).toBe("FAIR");
expect(getComplexityIndicator("O(n²)")).toBe("POOR");
expect(getComplexityIndicator("O(2^n)")).toBe("BAD");
expect(getComplexityIndicator("O(n!)")).toBe("TERRIBLE");
```

## Edge Cases to Test

### Function Variations

```python
# Empty function
def empty_function():
    pass

# Comment-only function
def commented_function():
    # This is just a comment
    return None

# Async function
async def async_function():
    await some_operation()
    return result

# Early return
def early_return_function(arr, target):
    for item in arr:
        if item == target:
            return item  # Early return
    return None
```

### Malformed Code

```python
# Missing closing parenthesis
def incomplete_function(
    # Missing body
```

## Common Test Patterns

### VSCode Extension Development Scenarios

```python
# File processing
def count_lines_of_code(file_content):
    lines = file_content.split('\n')
    count = 0
    for line in lines:
        if line.strip() and not line.startswith('#'):
            count += 1
    return count

# Code analysis
def find_function_definitions(code):
    functions = []
    for line in code.split('\n'):
        if line.strip().startswith('def '):
            functions.append(extract_function_name(line))
    return functions
```

### Performance Testing

```python
# Conditional complexity
def conditional_performance(data):
    if len(data) < 100:
        return expensive_operation(data)  # O(2^n) for small inputs
    else:
        return efficient_operation(data)  # O(n) for large inputs
```

## Debugging Failed Tests

### Common Issues

1. **Wrong complexity expectation**: Verify manual analysis matches expected result
2. **Confidence too low**: Check if pattern recognition needs improvement
3. **Function not detected**: Verify function definition syntax
4. **Space complexity bugs**: Check empty list + loop append patterns

### Debug Techniques

```typescript
// Log the full result for inspection
console.log(JSON.stringify(result, null, 2));

// Check individual method details
console.log(result.methods[0]);

// Verify function detection
expect(result.methods).toHaveLength(expectedCount);
```

This quick reference provides the essential patterns and testing approaches needed for effective development and testing of the Big O complexity analyzer.
