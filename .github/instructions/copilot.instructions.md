---
applyTo: "**"
---

# Copilot Instructions

This is a VS Code extension project for Big O complexity analysis. **ALWAYS read the project knowledge base first** at `.github/instructions/project-knowledge-base.md` for comprehensive project understanding.

## Project Context

- **Extension Name**: "Big-O-notation"
- **Language**: TypeScript-based VS Code extension for analyzing Python code complexity
- **Architecture**: NEW AST-manager architecture with direct Tree-sitter parsing
- **Testing**: Jest framework with comprehensive unit tests (50+ test cases)
- **Key Feature**: Real-time Big O complexity analysis with visual decorations using pure AST analysis

## New AST-Manager Architecture ⚡

### 🏗️ **Core Architecture**

- **Main Analyzer**: `ASTTimeComplexityAnalyzer` - Direct AST-based time complexity analysis
- **Space Analyzer**: `ASTSpaceComplexityAnalyzer` - Pure AST-based space complexity detection
- **Parser**: Tree-sitter Python v0.23.6 for robust AST parsing
- **Pattern Detectors**: Individual detector classes for each complexity type
- **Direct Integration**: No adapter patterns - analyzers used directly

### 🔍 **Analysis System**

```typescript
// SIMPLIFIED DIRECT USAGE
import { ASTTimeComplexityAnalyzer } from "../ast-manager/ASTTimeComplexityAnalyzer";

const astAnalyzer = new ASTTimeComplexityAnalyzer();
export function analyzeCodeComplexity(code: string): ComplexityAnalysisResult {
  return astAnalyzer.analyzeCodeTimeComplexity(code);
}
```

### 🎯 **Time Complexity Detectors**

- **FactorialTimeComplexityDetector**: O(n!) patterns (permutations, N-Queens)
- **ExponentialTimeComplexityDetector**: O(2^n) patterns (recursive calls, subsets)
- **QuadraticTimeComplexityDetector**: O(n²) patterns (nested loops, matrix operations)
- **LinearithmicTimeComplexityDetector**: O(n log n) patterns (sorting, divide-and-conquer)
- **LinearTimeComplexityDetector**: O(n) patterns (single loops, list comprehensions)
- **LogarithmicTimeComplexityDetector**: O(log n) patterns (binary search, tree traversal)
- **ConstantTimeComplexityDetector**: O(1) patterns (direct access, simple operations)

### 🧠 **Space Complexity Detectors**

- **LinearSpaceComplexityDetector**: O(n) patterns (data structure growth in loops)
- **ConstantSpaceComplexityDetector**: O(1) patterns (simple variables, direct operations)

## Critical Knowledge

### 🔧 **Fixed Bugs - Don't Reintroduce**

1. **Adapter Pattern Removed**: Simplified to direct AST-manager usage - no wrapper classes
2. **Space Complexity Integration**: Both time and space use AST-manager architecture
3. **Parser Integration**: Built-in Tree-sitter parser in analyzers - no external setup needed
4. **Method Implementation**: `analyzeCodeTimeComplexity()` method implemented in ASTTimeComplexityAnalyzer
5. **Direct Function Analysis**: Functions found and analyzed using AST nodes directly

### 🧪 **Testing Framework Status**

- **Framework**: Jest v29.7.0 with ts-jest preset (✅ All tests passing)
- **Configuration**: `jest.config.js` with Node.js environment and VSCode mocking
- **Command**: `npm test` to run all tests
- **Architecture**: Direct AST-manager integration with Jest testing
- **Coverage**: All complexity types O(1) through O(n!) with comprehensive edge cases

### 📊 **AST-Based Analysis Capabilities**

- **Time Complexity**: O(1), O(log n), O(n), O(n log n), O(n²), O(2^n), O(n!) via dedicated detectors
- **Space Complexity**: O(1), O(n) with AST-based data structure tracking
- **Pure AST Analysis**: No regex patterns - only Tree-sitter AST node analysis
- **Pattern Recognition**: VSCode extension scenarios, algorithms, real-world patterns
- **Language Support**: Python with Tree-sitter parser (extensible architecture)

### 🗂️ **File Structure (Updated)**

- `src/ast-manager/`: **NEW** Core AST analysis architecture
  - `ASTTimeComplexityAnalyzer.ts`: Main time complexity analyzer with built-in parser
  - `ASTSpaceComplexityAnalyzer.ts`: Space complexity analyzer
  - `time-complexity-detectors/`: Individual detector classes for each complexity type
  - `space-complexity-detectors/`: Space complexity pattern detectors
  - `models/ComplexityNode.ts`: Unified complexity analysis data structures
- `src/analysis/complexityAnalyzer.ts`: **SIMPLIFIED** Direct AST-manager usage
- `src/analysis/spaceAnalyzer.ts`: **UPDATED** Uses ASTSpaceComplexityAnalyzer
- `src/tests/`: Jest unit tests with 50+ test cases

## Development Guidelines

### AST-Manager Usage Patterns

**✅ CORRECT - Direct Usage:**

```typescript
import { ASTTimeComplexityAnalyzer } from "../ast-manager/ASTTimeComplexityAnalyzer";

const analyzer = new ASTTimeComplexityAnalyzer();
const result = analyzer.analyzeCodeTimeComplexity(code);
```

**❌ INCORRECT - Don't create wrappers:**

```typescript
// Don't create DirectASTAnalyzer or other wrapper classes
class DirectASTAnalyzer { ... }
```

### Detector Implementation Pattern

**Time Complexity Detector:**

```typescript
export class ExampleTimeComplexityDetector extends TimeComplexityPatternDetector {
  readonly notation = "O(n)";
  readonly confidence = 90;
  readonly priority = 10;

  detect(context: ComplexityAnalysisContext): ComplexityPattern | null {
    // Pure AST analysis logic
  }
}
```

**Space Complexity Detector:**

```typescript
export class ExampleSpaceComplexityDetector extends SpaceComplexityPatternDetector {
  readonly notation = "O(n)";
  readonly confidence = 90;
  readonly priority = 10;

  detect(functionNode: Parser.SyntaxNode, parser: Parser): boolean {
    // AST-based space analysis
  }
}
```

## Development Guidelines

### API References

Use `get_vscode_api` with a query as input to fetch the latest VS Code API references when working with:

- Extension lifecycle and activation
- Command registration and contribution points
- Webview providers and message passing
- Text decorations and editor integration
- Configuration and settings management

### Code Quality Standards

- **TypeScript**: Use strict typing throughout the extension
- **Error Handling**: Implement graceful degradation for malformed code
- **Testing**: Write comprehensive Jest unit tests for all new functionality
- **Performance**: Optimize AST pattern matching for real-time analysis
- **Documentation**: Update knowledge base when making architectural changes

### File Structure Knowledge

- `src/extension.ts`: Main extension entry point
- `src/analysis/`: **SIMPLIFIED** Direct AST-manager integration (complexityAnalyzer.ts, spaceAnalyzer.ts)
- `src/ast-manager/`: **NEW** Core AST analysis architecture with detectors
- `src/tests/`: Jest unit tests with 50+ comprehensive test cases
- `src/utils/`: Helper utilities and complexity indicators
- `src/decorations/`: Visual decoration management

### Pattern Detection Rules (AST-Based)

- **O(1)**: Direct access, cache operations, simple calculations, mathematical formulas
- **O(log n)**: Binary search patterns, tree traversal, halving operations in loops
- **O(n)**: Single loops, list comprehensions, linear scans, data structure iterations
- **O(n log n)**: Sorting operations, merge/divide-and-conquer patterns
- **O(n²)**: True nested loops, matrix operations, all-pairs comparisons
- **O(2^n)**: Multiple recursive calls, exponential tree growth, subset generation
- **O(n!)**: Permutation generation, factorial recursive patterns, N-Queens problem

### Enhanced AST Detection Logic

- **Pure AST Analysis**: No regex patterns - only Tree-sitter node type analysis
- **Context-Aware Patterns**: Function scope, nesting levels, variable tracking
- **Priority-Based Detection**: Higher complexity patterns detected first
- **Confidence Scoring**: AST-based confidence levels (70-95% for accurate patterns)

## Testing Requirements

### Jest Configuration

- **Framework**: Jest v29.7.0 with direct AST-manager integration
- **Command**: `npm test` for running all tests
- **Coverage**: All complexity types with AST-based pattern verification
- **Real-world Patterns**: VSCode extension development scenarios

### Test Categories

1. **Unit Tests**: Individual module testing
2. **Integration Tests**: End-to-end complexity analysis
3. **Pattern Tests**: All complexity type coverage
4. **Edge Cases**: Malformed code, empty functions, async patterns

### Test Categories

1. **Unit Tests**: Individual module testing
2. **Integration Tests**: End-to-end complexity analysis
3. **Pattern Tests**: All complexity type coverage
4. **Edge Cases**: Malformed code, empty functions, async patterns

## Extension Development Best Practices

### VS Code Integration

- Follow VS Code extension best practices for activation and lifecycle
- Use proper disposal and cleanup for resources
- Implement efficient text decoration updates
- Handle user settings and configuration properly

### Performance Optimization

- Optimize AST patterns for pattern matching
- Implement efficient caching mechanisms
- Use background processing for analysis
- Minimize blocking operations in main thread

### User Experience

- Provide clear visual feedback with decorations
- Offer educational complexity explanations
- Ensure non-intrusive real-time analysis
- Support user preferences and customization

## Prohibited Actions

- ❌ **Don't create adapter/wrapper classes** - Use AST-manager directly
- ❌ **Don't modify space analyzer without understanding AST context tracking**
- ❌ **Don't change Jest configuration** - It's working correctly
- ❌ **Don't ignore the project knowledge base** - Always reference it first
- ❌ **Don't use regex patterns in detectors** - Use pure AST analysis only

## Required Actions

- ✅ **Always read project-knowledge-base.md first** for context
- ✅ **Follow complexity-analysis-workflow.md** for systematic analysis
- ✅ **Use AST-manager directly** - no wrapper classes needed
- ✅ **Write Jest tests** for new functionality
- ✅ **Follow Tree-sitter AST patterns** for all analysis
- ✅ **Update knowledge base** when making architectural changes
- ✅ **Follow TypeScript strict typing** throughout the codebase

## Performance & Quality

### AST Analysis Best Practices

- **Tree-sitter Integration**: Use SyntaxNode traversal for pattern detection
- **Priority-Based Detection**: Higher complexity patterns checked first
- **Context-Aware Analysis**: Consider function scope and nesting
- **Confidence Scoring**: Provide meaningful confidence levels (70-95%)

### Testing Requirements

- **Jest Integration**: All new detectors must have comprehensive Jest tests
- **Pattern Coverage**: Test all supported complexity patterns
- **Edge Cases**: Handle malformed code gracefully
- **Real-world Scenarios**: Include VSCode extension development patterns
