---
applyTo: "**"
---

# Copilot Instructions

This is a VS Code extension project for Big O complexity analysis. **ALWAYS read the project knowledge base first** at `.github/instructions/project-knowledge-base.md` for comprehensive project understanding.

## Project Context

- **Extension Name**: "Big-O-notation"
- **Language**: TypeScript-based VS Code extension for analyzing Python code complexity
- **Architecture**: Modular design with analysis, decorations, patterns, and utilities
- **Testing**: Jest framework with comprehensive unit tests (50+ test cases)
- **Key Feature**: Real-time Big O complexity analysis with visual decorations

## Critical Knowledge

### 🔧 **Fixed Bugs - Don't Reintroduce**

1. **Space Complexity Bug**: Fixed issue where `result = []` + `result.append(i)` in loops was incorrectly analyzed as O(1) instead of O(n)
2. **Async Detection**: Fixed `async def` function detection in complexity analyzer
3. **Jest Setup**: Successfully migrated from VSCode extension testing to classical Jest unit testing
4. **Divide-and-Conquer False Positives**: Fixed `.split('.')` being detected as O(n log n) by making patterns more specific
5. **Nested Loop Detection**: Enhanced logic to distinguish true O(n²) patterns from false positives with constant inner loops
6. **Sorting in Nested Functions**: Fixed `sorted()` calls missed when inside functions with nested functions
7. **Binary Search Patterns**: Enhanced O(log n) detection with comprehensive binary search patterns

### 🧪 **Testing Framework Status**

- **Framework**: Jest v29.7.0 with ts-jest preset (50/50 tests passing ✅)
- **Configuration**: `jest.config.js` with Node.js environment and VSCode mocking
- **Command**: `npm test` to run all tests
- **Coverage**: All complexity types O(1) through O(n!) with comprehensive edge cases
- **Latest Fixes Verified**: File extensions, cyclomatic complexity, matrix operations, suggestion ranking all working

### 🧪 **Testing Framework**

- **Framework**: Jest v29.7.0 with ts-jest preset
- **Configuration**: `jest.config.js` with Node.js environment and VSCode mocking
- **Command**: `npm test` to run all tests
- **Coverage**: 50+ tests covering all complexity types, edge cases, and real-world patterns

### 📊 **Complexity Analysis Capabilities**

- **Time Complexity**: O(1), O(log n), O(n), O(n log n), O(n²), O(2^n), O(n!)
- **Space Complexity**: Context-aware analysis with loop tracking
- **Pattern Recognition**: VSCode extension development scenarios, sorting, searching, recursive patterns
- **Language Support**: Python (extensible architecture for other languages)

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
- **Performance**: Optimize pattern matching for real-time analysis
- **Documentation**: Update knowledge base when making architectural changes

### File Structure Knowledge

- `src/extension.ts`: Main extension entry point
- `src/analysis/`: Core complexity analysis logic (complexityAnalyzer.ts, spaceAnalyzer.ts)
- `src/tests/`: Jest unit tests (complexity.test.ts with 50+ test cases)
- `src/patterns/`: Pattern recognition modules (basic, loop, recursion)
- `src/utils/`: Helper utilities and complexity indicators
- `src/decorations/`: Visual decoration management

### Pattern Detection Rules (Enhanced)

- **O(1)**: Direct access, cache operations, simple calculations, file extension extraction
- **O(log n)**: Binary search (`while left <= right`), halving operations, tree traversal, bracket matching
- **O(n)**: Single loops, list comprehensions, linear scans, cyclomatic complexity calculation
- **O(n log n)**: Sorting operations (`sorted()`, `.sort()`), merge sort patterns, suggestion ranking
- **O(n²)**: True nested loops (matrix operations, similarity calculation), all-pairs comparisons
- **O(2^n)**: Multiple recursive calls, combination generation, exponential patterns
- **O(n!)**: All permutations, traveling salesman brute force, N-Queens problem

### Enhanced Detection Logic

- **Nested Loop Intelligence**: Distinguishes `for row in matrix: for col in row` (O(n²)) from `for line in code: for keyword in keywords` (O(n))
- **Full Context Sorting**: Checks both immediate function body and full context for `sorted()` calls
- **Specific Divide-and-Conquer**: Targets actual algorithms (`merge_sort`, `quick_sort`) not simple operations (`.split()`)
- **Binary Search Patterns**: Comprehensive detection including `mid = (left + right) // 2` variations

### Space Complexity Context

- **Empty List Tracking**: Monitor variables created as `[]`
- **Loop Context**: Track when inside for/while loops
- **Append Detection**: Recognize `.append()` operations on tracked lists as O(n)

## Testing Requirements

### Jest Configuration

- **Never revert to VSCode extension testing** - Jest setup is working perfectly
- Use `npm test` for running all tests
- Maintain test coverage for all complexity types
- Test real-world VSCode extension development patterns

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

- Optimize regex patterns for pattern matching
- Implement efficient caching mechanisms
- Use background processing for analysis
- Minimize blocking operations in main thread

### User Experience

- Provide clear visual feedback with decorations
- Offer educational complexity explanations
- Ensure non-intrusive real-time analysis
- Support user preferences and customization

## Prohibited Actions

- ❌ **Don't create VSCode extension test files** - Use Jest only
- ❌ **Don't modify space analyzer without understanding context tracking**
- ❌ **Don't change Jest configuration** - It's working correctly
- ❌ **Don't ignore the project knowledge base** - Always reference it first

## Required Actions

- ✅ **Always read project-knowledge-base.md first** for context
- ✅ **Use get_vscode_api tool** for VS Code API questions
- ✅ **Write Jest tests** for new functionality
- ✅ **Update knowledge base** when making architectural changes
- ✅ **Follow TypeScript strict typing** throughout the codebase
