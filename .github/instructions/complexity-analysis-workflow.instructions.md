# Big O Complexity Analysis Workflow

## Overview
This document provides a complete workflow for analyzing and adding complexity detection tests to the Big O notation VS Code extension. Follow these steps to maintain and extend the complexity analysis capabilities.

## Project Architecture

### Core Components
- **ASTTimeComplexityAnalyzer**: Main time complexity analysis engine using Tree-sitter
- **FactorialTimeComplexityDetector**: Detects O(n!) patterns
- **ExponentialTimeComplexityDetector**: Detects O(2^n) patterns
- **Other Detectors**: O(1), O(log n), O(n), O(n log n), O(n²), O(n³)
- **Test Suites**: Comprehensive Jest tests validating all complexity patterns

### Analysis Pipeline
```
Python Code → Tree-sitter Parser → AST Analysis → Pattern Detectors → Complexity Result
```

## Function Analysis Workflow

### Step 1: Code Pattern Recognition

#### 1.1 Identify Algorithmic Patterns (NOT names)
**CRITICAL**: Base detection on **algorithmic structure**, NOT function/variable names.

```python
# ✅ CORRECT: Analyze the algorithm structure
def mystery_function(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2  # ← This halving pattern = O(log n)
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# ❌ WRONG: Don't rely on function name "binary_search"
```

#### 1.2 Complexity Pattern Categories

**O(1) - Constant Time:**
- Direct access: `arr[0]`, `dict[key]`
- Simple arithmetic: `a + b`, `x * 2`
- Cache operations: single lookups

**O(log n) - Logarithmic Time:**
- Binary search: `mid = (left + right) // 2`
- Tree traversal: single path down
- Halving loops: `i = i // 2`

**O(n) - Linear Time:**
- Single loop: `for item in arr`
- List comprehensions: `[x for x in arr]`
- Built-in operations: `sum(arr)`, `max(arr)`

**O(n log n) - Linearithmic Time:**
- Sorting: `sorted(arr)`, merge sort, quick sort
- Divide and conquer with merge

**O(n²) - Quadratic Time:**
- Nested loops: both dependent on input size
- Matrix operations: 2D array access
- All-pairs comparisons

**O(n³) - Cubic Time:**
- Triple nested loops
- Matrix multiplication: `result[i][j] += A[i][k] * B[k][j]`

**O(2^n) - Exponential Time:**
- Multiple recursive calls: `fib(n-1) + fib(n-2)`
- Subset generation: all combinations
- Tree exploration: all paths

**O(n!) - Factorial Time:**
- Permutation generation: all arrangements
- Traveling salesman (brute force)
- N-Queens: all solutions

### Step 2: AST-Based Detection Logic

#### 2.1 Tree-sitter Analysis Points
```typescript
// Key AST patterns to check:
- for_statement: Loop structures
- while_statement: Iterative patterns
- call: Function calls (recursive, built-in)
- assignment: Data structure growth
- subscript: Array/matrix access patterns
```

#### 2.2 Detection Priority Order
```typescript
1. FactorialTimeComplexityDetector    // O(n!) - highest priority
2. ExponentialTimeComplexityDetector  // O(2^n)
3. CubicTimeComplexityDetector        // O(n³)
4. QuadraticTimeComplexityDetector    // O(n²)
5. LinearithmicTimeComplexityDetector // O(n log n)
6. LinearTimeComplexityDetector       // O(n)
7. LogarithmicTimeComplexityDetector  // O(log n)
8. ConstantTimeComplexityDetector     // O(1) - lowest priority
```

### Step 3: Function Analysis Process

#### 3.1 Manual Analysis Steps
```bash
# 1. Create test file for new function
node debug_test.js

# 2. Check current detection result
# Look for: notation, description, confidence

# 3. If incorrect, identify the issue:
# - Wrong complexity detected?
# - Low confidence score?
# - Incorrect pattern matching?
```

#### 3.2 Debugging Checklist
```typescript
// Check these AST analysis points:
□ Loop counting (forLoopCount, whileLoopCount)
□ Nesting detection (isNested)
□ Parameter dependency (function params in loops)
□ Recursive call patterns (recursiveCallCount)
□ Built-in function usage (linear ops, sorting)
□ Pattern exclusions (higher complexity filters)
```

## Test Creation Workflow

### Step 1: Test File Organization
```
src/tests/time-complexity-tests/
├── complexity-excellent.test.ts    # O(1) patterns
├── complexity-good.test.ts         # O(log n) patterns  
├── complexity-fair.test.ts         # O(n log n) patterns
├── complexity-poor.test.ts         # O(n²), O(n³) patterns
├── complexity-bad.test.ts          # O(2^n) patterns
└── complexity-terrible.test.ts     # O(n!) patterns
```

### Step 2: Test Template
```typescript
test("should identify [function_name] as O([complexity])", () => {
  const pythonCode = `def [function_name]([parameters]):
    """[Description] - O([complexity])"""
    [function_implementation]`;

  const result = analyzeCodeComplexity(pythonCode);
  
  // Basic validation
  expect(result.methods).toHaveLength(1);
  expect(result.methods[0].name).toBe("[function_name]");
  expect(result.methods[0].complexity.notation).toBe("O([complexity])");
  
  // Confidence validation (for new tests)
  expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
});
```

### Step 3: Test Validation
```bash
# Run specific test file
npm test -- src/tests/time-complexity-tests/complexity-[rating].test.ts

# Run all tests
npm test

# Check for regressions
# Ensure all 211+ tests still pass
```

## Adding New Complexity Patterns

### Step 1: Detector Enhancement
```typescript
// Example: Enhancing LinearTimeComplexityDetector
// Location: src/ast-manager/time-complexity-detectors/

// Add new pattern detection method
private detectNewPattern(node: any): boolean {
  // AST analysis logic
  // Return true if pattern matches
}

// Update main detect() method
if (this.detectNewPattern(node)) {
  patterns.push("new_pattern");
  reasons.push("Description of new pattern");
  confidence += [confidence_score];
}
```

### Step 2: Testing New Patterns
```typescript
// Add test in appropriate complexity-[rating].test.ts file
test("should identify [new_pattern] as O([complexity])", () => {
  const pythonCode = `def [pattern_function]([params]):
    [pattern_implementation]`;

  const result = analyzeCodeComplexity(pythonCode);
  expect(result.methods[0].complexity.notation).toBe("O([complexity])");
  expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
});
```

## Common Issues and Solutions

### Issue 1: Low Confidence Score
**Problem**: Function detected with <70% confidence
**Solution**: 
1. Increase confidence points in detector
2. Add more specific pattern matching
3. Verify AST node traversal

### Issue 2: Wrong Complexity Detected
**Problem**: Function detected as wrong complexity class
**Solution**:
1. Check detector priority order
2. Verify exclusion logic in higher-priority detectors
3. Add specific patterns to correct detector

### Issue 3: Test Description Mismatch
**Problem**: Test expects specific description text
**Solution**:
1. Update detector description generation
2. Ensure consistent terminology
3. Match test expectations exactly

### Issue 4: AST Traversal Issues
**Problem**: Patterns not detected due to AST structure
**Solution**:
1. Debug AST node structure with console.log
2. Use Tree-sitter playground for visualization
3. Update traversal logic for Python syntax

## Example: Adding O(n!) Factorial Functions

### Step 1: Identify Missing Functions
```bash
# Search existing tests
grep -r "function_name" src/tests/
# If not found, add to complexity-terrible.test.ts
```

### Step 2: Add Test Cases
```typescript
// Add to complexity-terrible.test.ts in O(n!) section
test("should identify all_permutations using itertools as O(n!)", () => {
  const pythonCode = `def all_permutations(arr):
    from itertools import permutations
    return list(permutations(arr))`;

  const result = analyzeCodeComplexity(pythonCode);
  expect(result.methods[0].complexity.notation).toBe("O(n!)");
  expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
});
```

### Step 3: Verify Detection
```bash
# Compile and test
npm run compile
npm test -- src/tests/time-complexity-tests/complexity-terrible.test.ts
```

## Quality Assurance

### Test Coverage Requirements
- ✅ All complexity classes: O(1) through O(n!)
- ✅ Multiple algorithms per complexity class
- ✅ Edge cases and false positive prevention
- ✅ Real-world algorithm patterns
- ✅ High confidence scores (≥70%)

### Performance Standards
- ✅ 100% test pass rate
- ✅ No regression in existing tests
- ✅ Accurate complexity detection
- ✅ Meaningful descriptions and confidence scores

### Code Quality
- ✅ TypeScript strict typing
- ✅ Comprehensive error handling
- ✅ AST-based analysis (no regex patterns)
- ✅ Proper Tree-sitter integration
- ✅ Clean, maintainable code structure

## Commands Reference

### Development Commands
```bash
# Compile TypeScript
npm run compile

# Run all tests
npm test

# Run specific test file
npm test -- [test-file-path]

# Debug specific function
node debug_test.js

# Check terminal output
get_terminal_output [terminal-id]
```

### File Locations
```bash
# Main analyzers
src/ast-manager/ASTTimeComplexityAnalyzer.ts

# Detectors
src/ast-manager/time-complexity-detectors/

# Test files
src/tests/time-complexity-tests/

# Constants
src/constants/timeComplexityNotationsConst.ts
src/constants/complexityIndicatorsConst.ts

# Utils
src/utils/complexityHelperUtils.ts
```

## Success Metrics

### Current Status (211+ tests)
- **O(1)**: 15+ patterns tested
- **O(log n)**: 10+ patterns tested  
- **O(n)**: 20+ patterns tested
- **O(n log n)**: 8+ patterns tested
- **O(n²)**: 15+ patterns tested
- **O(n³)**: 5+ patterns tested
- **O(2^n)**: 25+ patterns tested
- **O(n!)**: 10+ patterns tested

### Quality Metrics
- **Pass Rate**: 100% (211/211)
- **Confidence**: ≥70% for all new patterns
- **Coverage**: All major algorithmic patterns
- **Accuracy**: Logic-based detection, not name-based

---

**Follow this workflow systematically to maintain and extend the Big O notation analyzer with high quality and comprehensive test coverage.**
