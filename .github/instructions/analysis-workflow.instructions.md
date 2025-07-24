# Big O Analysis Workflow Instructions

## Overview

This document describes the complete workflow for detecting time and space complexity in Python code using AST-based analysis.

## Architecture

### Core Components

1. **ASTTimeComplexityAnalyzer**: Main time complexity analysis engine
2. **ASTSpaceComplexityAnalyzer**: Space complexity analysis engine
3. **Time Complexity Detectors**: Pattern-specific detectors for each complexity class
4. **Space Complexity Detectors**: Pattern-specific detectors for space analysis
5. **ComplexityAnalyzer**: Entry point that coordinates analysis

### Analysis Flow

```
Python Code → Tree-sitter Parser → AST → Pattern Detectors → Complexity Result
```

## Time Complexity Detection Workflow

### 1. Priority-Based Detection Order

Detectors are ordered from highest to lowest complexity to prevent false negatives:

```typescript
1. FactorialTimeComplexityDetector    // O(n!)
2. ExponentialTimeComplexityDetector  // O(2^n)
3. CubicTimeComplexityDetector        // O(n³)
4. QuadraticTimeComplexityDetector    // O(n²)
5. LinearithmicTimeComplexityDetector // O(n log n)
6. LinearTimeComplexityDetector       // O(n)
7. LogarithmicTimeComplexityDetector  // O(log n)
8. ConstantTimeComplexityDetector     // O(1)
```

### 2. Detection Logic Principles

#### Core Principle: Logic Over Names

**CRITICAL**: Detection is based on **algorithmic patterns**, NOT function/variable names.

```python
# ✅ CORRECT: Detected as O(log n) based on halving pattern
def mysterious_function(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2  # Halving search space
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# ❌ WRONG: Don't rely on function name "binary_search"
```

### 3. Complexity Detection Patterns

#### O(1) - Constant Time

**Patterns:**

- Direct array/dict access: `arr[0]`, `dict[key]`
- Simple arithmetic operations
- Single assignments/comparisons
- Cache operations

**Detection Methods:**

```typescript
- detectDirectAccess(): Direct indexing operations
- detectMathOperations(): Simple calculations
- detectCacheOperations(): Dictionary lookups
```

**Confidence Levels:**

- Direct access: 95%
- Math operations: 90%
- Cache ops: 85%

#### O(log n) - Logarithmic Time

**Patterns:**

- Binary search: `mid = (left + right) // 2`
- Tree traversal: Single path down tree
- Halving loops: `i = i // 2`
- Bracket matching: Early termination

**Detection Methods:**

```typescript
- detectClassicBinarySearch(): 95% confidence
- detectBSTTraversal(): 90% confidence
- detectDivideByTwoLoop(): 85% confidence
- detectBracketMatching(): 80% confidence
```

#### O(n) - Linear Time

**Patterns:**

- Single loop through input
- List comprehensions
- Built-in operations: `sum()`, `max()`
- Single loop with constant inner operations

**Detection Methods:**

```typescript
- detectSingleLoop(): One loop over input
- detectSingleLoopWithConstantInner(): Nested but inner is constant
- detectListComprehensions(): List/dict comprehensions
- detectBuiltinLinearOps(): sum(), max(), etc.
```

#### O(n log n) - Linearithmic Time

**Patterns:**

- Sorting algorithms: merge sort, quick sort
- Built-in sorting: `sorted()`, `list.sort()`
- Divide and conquer with merge

**Detection Methods:**

```typescript
- detectClassicMergeSort(): 95% confidence
- detectBuiltinSortingCalls(): 90% confidence
- detectClassicQuickSort(): 85% confidence
- detectDivideAndConquerMerge(): 75% confidence
```

#### O(n²) - Quadratic Time

**Patterns:**

- True nested loops (both depend on input size)
- Matrix operations
- All-pairs comparisons
- Simple sorting: bubble, selection, insertion

**Detection Methods:**

```typescript
- detectTrueNestedLoops(): Both loops input-dependent
- detectMatrixOperations(): 2D matrix access
- detectAllPairsOperations(): Compare all elements
- detectSimpleSorting(): Basic sorting algorithms
```

**False Positive Prevention:**

- Exclude constant-sized inner loops
- Verify both loops are input-dependent

#### O(n³) - Cubic Time

**Patterns:**

- Triple nested loops
- Matrix multiplication: `result[i][j] += A[i][k] * B[k][j]`
- 3D matrix operations
- All triplets operations

**Detection Methods:**

```typescript
- detectClassicMatrixMultiplication(): 95% confidence
- detectTripleNestedLoops(): 90% confidence
- detect3DMatrixOperations(): 85% confidence
```

#### O(2^n) - Exponential Time

**Patterns:**

- Multiple recursive calls: `fib(n-1) + fib(n-2)`
- Subset generation
- Tree exploration: All paths
- Combinatorial problems

**Detection Methods:**

```typescript
- detectClassicFibonacci(): 95% confidence
- detectTowerOfHanoi(): 90% confidence
- detectBinaryTreeAllPaths(): 85% confidence
- detectSubsetGeneration(): 80% confidence
```

#### O(n!) - Factorial Time

**Patterns:**

- Permutation generation
- All arrangements
- Traveling salesman (brute force)
- N-Queens problem

**Detection Methods:**

```typescript
- detectPermutationGeneration(): 95% confidence
- detectAllArrangements(): 90% confidence
- detectTravelingSalesman(): 85% confidence
- detectNQueens(): 80% confidence
```

## Space Complexity Detection Workflow

### 1. Detection Order

```typescript
1. LinearSpaceComplexityDetector   // O(n)
2. ConstantSpaceComplexityDetector // O(1)
```

### 2. Space Patterns

#### O(1) - Constant Space

**Patterns:**

- Simple variables
- Mathematical operations
- Direct access without data structure growth

#### O(n) - Linear Space

**Patterns:**

- Data structure growth in loops
- List comprehensions creating new structures
- Accumulator patterns

## Confidence Scoring System

### High Confidence (90-95%)

- Specific algorithmic patterns with clear signatures
- Classic algorithm implementations
- Well-defined mathematical operations

### Medium Confidence (75-89%)

- General patterns with some variations
- Common programming constructs
- Heuristic-based detection

### Low Confidence (70-74%)

- Fallback patterns
- Keyword-based detection
- Ambiguous cases

## Constants and Utilities

### Use Existing Constants

```typescript
// From timeComplexityNotationsConst.ts
TIME_COMPLEXITY_NOTATIONS.O_1 = "O(1)";
TIME_COMPLEXITY_NOTATIONS.O_LOG_N = "O(log n)";
// etc.

// From complexityIndicatorsConst.ts
COMPLEXITY_INDICATORS.EXCELLENT = "EXCELLENT";
COMPLEXITY_INDICATORS.GOOD = "GOOD";
// etc.
```

### Shared Utilities

- Use `complexityHelperUtils.ts` for common operations
- Use `timeComplexityComparatorUtils.ts` for comparisons
- Avoid duplicate methods across files

## Testing Strategy

### Test by Complexity Class

```bash
npm test complexity-excellent.test.ts  # O(1)
npm test complexity-good.test.ts      # O(log n)
npm test complexity-fair.test.ts      # O(n log n)
npm test complexity-poor.test.ts      # O(n²), O(n³)
npm test complexity-bad.test.ts       # O(2^n)
npm test complexity-terrible.test.ts  # O(n!)
```

### Validation Criteria

1. **Logic-based detection**: Ignore function/variable names
2. **High confidence**: Aim for 90%+ confidence on clear patterns
3. **False positive prevention**: Distinguish similar patterns
4. **Edge case handling**: Handle malformed/empty code gracefully

## Error Handling

### Graceful Degradation

- Invalid code → Default to O(1) with error message
- Empty code → O(1) with appropriate description
- Parser errors → Fallback to keyword-based analysis

### Debugging

- Use console.log for development debugging
- Check AST structure for pattern verification
- Validate confidence scores meet thresholds

## Performance Considerations

### AST Traversal Optimization

- Use `traverseAST()` helper for consistent traversal
- Minimize redundant tree walks
- Cache results where appropriate

### Pattern Matching Efficiency

- Order patterns by likelihood/frequency
- Early termination when high-confidence match found
- Avoid expensive operations in tight loops

## Integration Points

### Entry Points

- `analyzeCodeComplexity()`: Main time complexity analysis
- `analyzeSpaceComplexity()`: Space complexity analysis
- `getComplexityIndicator()`: Rating classification

### Output Format

```typescript
interface ComplexityAnalysisResult {
  methods: MethodAnalysis[];
}

interface MethodAnalysis {
  name: string;
  complexity: {
    notation: string;
    description: string;
    confidence: number;
  };
  spaceComplexity: SpaceComplexityResult;
}
```

This workflow ensures consistent, accurate, and maintainable complexity analysis based on algorithmic patterns rather than naming conventions.
