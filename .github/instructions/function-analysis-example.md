# Example: Function Analysis Step-by-Step

## Scenario: Analyzing a New Function

Let's walk through analyzing this function that was incorrectly detected:

```python
def is_safe(board, row, col):
    # Check column conflicts
    for i in range(row):
        if board[i] == col:
            return False
    
    # Check diagonal conflicts  
    for i in range(row):
        if abs(board[i] - col) == abs(i - row):
            return False
    return True
```

## Step 1: Initial Analysis

### 1.1 Create Debug Test
```javascript
// Create debug_test.js
const { analyzeCodeComplexity } = require('./src/analysis/complexityAnalyzer');

const code = `def is_safe(board, row, col):
    # Check column conflicts
    for i in range(row):
        if board[i] == col:
            return False
    
    # Check diagonal conflicts  
    for i in range(row):
        if abs(board[i] - col) == abs(i - row):
            return False
    return True`;

const result = analyzeCodeComplexity(code);
console.log('=== Testing is_safe function ===');
console.log('Notation:', result.methods[0].complexity.notation);
console.log('Description:', result.methods[0].complexity.description);  
console.log('Confidence:', result.methods[0].complexity.confidence);
```

### 1.2 Run Analysis
```bash
node debug_test.js
```

**Initial Result (WRONG):**
```
Notation: O(1)
Description: Direct access operations
Confidence: 85
```

## Step 2: Problem Identification

### 2.1 Analyze the Algorithm Structure
```python
# What we see:
def is_safe(board, row, col):
    for i in range(row):        # ← Loop 1: depends on 'row' parameter
        if board[i] == col:     # ← Accessing board elements
            return False
    
    for i in range(row):        # ← Loop 2: depends on 'row' parameter  
        if abs(board[i] - col) == abs(i - row):
            return False
    return True

# Pattern Analysis:
# - Two sequential loops (not nested)
# - Both loops iterate from 0 to 'row' 
# - 'row' is a function parameter
# - In worst case, row = n (board size)
# - Therefore: O(row) = O(n) LINEAR TIME
```

### 2.2 Expected vs Actual
- **Expected**: O(n) - Linear time (loops over input parameter)
- **Actual**: O(1) - Constant time (incorrect)
- **Issue**: LinearTimeComplexityDetector not recognizing parameter-dependent loops

## Step 3: Root Cause Analysis

### 3.1 Check LinearTimeComplexityDetector
```typescript
// Location: src/ast-manager/time-complexity-detectors/LinearTimeComplexityDetector.ts
// Issue: detectSingleLoop() method not detecting:
// 1. Multiple sequential loops over same parameter
// 2. range(parameter) patterns where parameter is function param
```

### 3.2 AST Structure Investigation
```python
# The Tree-sitter AST sees:
for_statement:
  - "for"
  - identifier: "i" 
  - "in"
  - call:
    - identifier: "range"
    - argument_list:
      - identifier: "row"  # ← This is the key: 'row' is a function parameter
```

## Step 4: Fix Implementation

### 4.1 Update detectSingleLoop Method
```typescript
// Add parameter-dependent loop detection
private detectSingleLoop(node: any): boolean {
    const totalLoops = node.forLoopCount + node.whileLoopCount;
    
    // Standard case: exactly one loop, non-nested
    if (totalLoops === 1 && !node.isNested) {
        return this.isLoopOverInputData(node);
    }
    
    // NEW: Special case for multiple sequential loops (like N-Queens is_safe)
    if (totalLoops > 1 && !node.isNested && node.forLoopCount > 1 && node.whileLoopCount === 0) {
        return this.detectNQueensLikePattern(node);
    }

    return false;
}
```

### 4.2 Add Parameter Detection
```typescript
private isLoopOverInputParameter(forLoopNode: any, functionNode: any): boolean {
    const functionParameters = this.extractFunctionParameters(functionNode.astNode);
    let hasParameterDependentRange = false;

    this.traverseAST(forLoopNode, (node) => {
        if (node.type === "call" && node.children) {
            const functionName = node.children.find(child => child.type === "identifier");
            
            if (functionName && functionName.text === "range") {
                const argumentList = node.children.find(child => child.type === "argument_list");
                if (argumentList) {
                    this.traverseAST(argumentList, (argNode) => {
                        // Check for range(parameter) where parameter is function param
                        if (argNode.type === "identifier" && functionParameters.includes(argNode.text)) {
                            hasParameterDependentRange = true;
                        }
                    });
                }
            }
        }
    });

    return hasParameterDependentRange;
}
```

## Step 5: Testing and Validation

### 5.1 Compile and Test
```bash
npm run compile
node debug_test.js
```

**Fixed Result:**
```
Notation: O(n)
Description: Single loop over input data
Confidence: 85
```

### 5.2 Add Regression Test
```typescript
// Add to complexity-good.test.ts (O(n) patterns)
test("should identify N-Queens is_safe as O(n)", () => {
    const pythonCode = `def is_safe(board, row, col):
    # Check column conflicts
    for i in range(row):
        if board[i] == col:
            return False
    
    # Check diagonal conflicts
    for i in range(row):
        if abs(board[i] - col) == abs(i - row):
            return False
    return True`;

    const result = analyzeCodeComplexity(pythonCode);
    expect(result.methods[0].complexity.notation).toBe("O(n)");
    expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(70);
});
```

### 5.3 Verify No Regressions
```bash
npm test
# Should show: 211+ tests passing (increased from previous count)
```

## Step 6: Key Lessons

### 6.1 Analysis Principles
1. **Ignore function names** - Focus on algorithmic structure
2. **Identify parameter dependencies** - Are loops dependent on input size?
3. **Consider worst-case scenarios** - What's the maximum iterations?
4. **Multiple loops** - Sequential loops can still be O(n)

### 6.2 Common Patterns
```python
# O(n) - Sequential loops over same parameter
for i in range(n):
    # do something
for j in range(n):  
    # do something else
# Total: O(n) + O(n) = O(n)

# O(n²) - Nested loops over parameters  
for i in range(n):
    for j in range(n):
        # do something
# Total: O(n) * O(n) = O(n²)
```

### 6.3 Detection Strategy
1. **Count loops**: for + while statements
2. **Check nesting**: Are loops inside other loops?
3. **Parameter analysis**: Do loop bounds depend on function parameters?
4. **Pattern matching**: Specific algorithmic signatures
5. **Confidence scoring**: How certain are we of the detection?

## Summary

This example shows the complete workflow:
1. **Initial wrong detection** (O(1) instead of O(n))
2. **Manual analysis** of algorithmic structure  
3. **Root cause identification** (missing parameter detection)
4. **Code fix** (enhanced detector logic)
5. **Validation** (test and regression checks)

Following this systematic approach ensures accurate complexity detection and maintains the high quality of the analyzer.
