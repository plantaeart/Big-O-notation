# Quick Reference: Big O Analysis Tasks

## Fast Function Analysis

### Test a Single Function
```bash
# 1. Create debug_test.js with your function
# 2. Run analysis
node debug_test.js

# Expected output format:
# Notation: O(n)
# Description: Single loop over input data
# Confidence: 85
```

### Add Missing Test Function
```typescript
// 1. Search if function exists
grep -r "function_name" src/tests/

// 2. If not found, add to appropriate test file:
// O(1) → complexity-excellent.test.ts
// O(log n) → complexity-good.test.ts  
// O(n log n) → complexity-fair.test.ts
// O(n²), O(n³) → complexity-poor.test.ts
// O(2^n) → complexity-bad.test.ts
// O(n!) → complexity-terrible.test.ts

// 3. Use this template:
test("should identify [function_name] as O([complexity])", () => {
  const pythonCode = `def [function_name]([params]):
    [implementation]`;

  const result = analyzeCodeComplexity(pythonCode);
  expect(result.methods[0].complexity.notation).toBe("O([complexity])");
  expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
});
```

### Fix Wrong Complexity Detection
```bash
# 1. Identify current vs expected complexity
node debug_test.js

# 2. Check detector priority (higher complexity checked first):
# O(n!) > O(2^n) > O(n³) > O(n²) > O(n log n) > O(n) > O(log n) > O(1)

# 3. Common fixes:
# - Increase confidence in correct detector
# - Fix exclusion logic in wrong detector  
# - Add specific pattern matching
# - Verify AST traversal logic
```

## Pattern Recognition Quick Guide

### O(n!) Factorial Patterns
```python
# Permutations
for perm in permutations(arr):  # itertools
for i in range(len(arr)):       # recursive generation

# N-Queens backtracking
def solve(row):
    if row == n: return solutions
    for col in range(n):
        if is_safe(row, col):
            solve(row + 1)

# All arrangements/passwords
def generate(length):
    if length == 0: return [""]
    for shorter in generate(length-1):
        for char in chars:
            result.append(shorter + char)
```

### O(2^n) Exponential Patterns  
```python
# Multiple recursive calls
def fibonacci(n):
    return fibonacci(n-1) + fibonacci(n-2)

# Subset generation
def subsets(arr):
    if not arr: return [[]]
    return subsets(rest) + [x + [first] for x in subsets(rest)]

# Tree exploration (all paths)
def all_paths(node):
    left_paths = all_paths(node.left)
    right_paths = all_paths(node.right)
```

### O(n²) Quadratic Patterns
```python
# True nested loops (both depend on input)
for i in range(len(arr)):
    for j in range(len(arr)):  # or range(i+1, len(arr))
        
# Matrix operations
for i in range(n):
    for j in range(n):
        matrix[i][j] = something
```

### O(n) Linear Patterns
```python
# Single loop over input
for item in arr:
    process(item)

# Direct parameter iteration  
for element in parameter:
    
# Built-in linear operations
sum(arr), max(arr), arr.count(x)

# List comprehensions
[f(x) for x in arr]
```

### O(log n) Logarithmic Patterns
```python
# Binary search (halving)
while left <= right:
    mid = (left + right) // 2
    if arr[mid] == target: return mid
    elif arr[mid] < target: left = mid + 1
    else: right = mid - 1

# Tree traversal (single path)
while node:
    if value < node.val: node = node.left
    else: node = node.right
```

## Common Commands
```bash
# Compile TypeScript
npm run compile

# Run all tests (should be 211+ passing)
npm test

# Run specific test category
npm test -- complexity-terrible.test.ts

# Debug function analysis
node debug_test.js
```

## File Locations
```
# Detectors
src/ast-manager/time-complexity-detectors/[Complexity]TimeComplexityDetector.ts

# Tests  
src/tests/time-complexity-tests/complexity-[rating].test.ts

# Main analyzer
src/ast-manager/ASTTimeComplexityAnalyzer.ts
```

## Success Checklist
- ✅ Function correctly detected as expected complexity
- ✅ Confidence score ≥ 70%
- ✅ All 211+ tests still passing
- ✅ Description meaningful and accurate
- ✅ No regressions in other tests
