import { PythonKeywords } from "../constants/pythonKeyWordsConst";
import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";
import { getIndentLevel, isLoopStatement } from "../utils/codeParserUtils";

// Count nested loops in a function
export function countNestedLoops(lines: string[]): number {
  let maxNesting = 0;
  let currentNesting = 0;
  const indentStack: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, comments, and function definitions
    if (
      trimmed === "" ||
      trimmed.startsWith("#") ||
      trimmed.startsWith(PythonKeywords.DEF + " ")
    ) {
      continue;
    }

    const indentLevel = getIndentLevel(line);

    // Pop from stack if we've dedented
    while (
      indentStack.length > 0 &&
      indentStack[indentStack.length - 1] >= indentLevel
    ) {
      indentStack.pop();
      currentNesting--;
    }

    // Check if this is a loop statement
    if (isLoopStatement(line)) {
      indentStack.push(indentLevel);
      currentNesting++;
      maxNesting = Math.max(maxNesting, currentNesting);
    }
  }

  return maxNesting;
}

// Detect quadratic patterns (nested loops)
export function detectQuadratic(lines: string[]): boolean {
  return countNestedLoops(lines) >= 2;
}

// Detect cubic patterns (three nested loops)
export function detectCubic(lines: string[]): boolean {
  return countNestedLoops(lines) >= 3;
}

// Detect sorting operations which are typically O(n log n)
export function detectSorting(line: string): boolean {
  const sortingPatterns = [
    /\.sort\(/,
    /sorted\(/,
    /merge_sort/,
    /quick_sort/,
    /heap_sort/,
    /merge\(/,
    /partition\(/,
  ];

  return sortingPatterns.some((pattern) => pattern.test(line));
}

// Detect matrix operations
export function detectMatrixOperations(lines: string[]): boolean {
  const nestedLoops = countNestedLoops(lines);

  // Look for matrix-like access patterns
  const hasMatrixAccess = lines.some((line) =>
    /\[\s*[a-zA-Z_]\w*\s*\]\s*\[\s*[a-zA-Z_]\w*\s*\]/.test(line)
  );

  return nestedLoops >= 2 && hasMatrixAccess;
}

// Detect list comprehensions with nesting
export function detectNestedComprehensions(line: string): boolean {
  const comprehensions = (line.match(/\[.*?for.*?in.*?\]/g) || []).length;
  const generators = (line.match(/\(.*?for.*?in.*?\)/g) || []).length;

  return comprehensions + generators > 1;
}

// Check for loop patterns that indicate specific complexities
export function analyzeLoopComplexity(lines: string[]): string {
  const nestedCount = countNestedLoops(lines);

  // First check for built-in sorting functions
  const hasBuiltinSort = lines.some((line) => /sorted\(|\.sort\(/.test(line));
  if (hasBuiltinSort) {
    return TimeComplexityNotation.LINEARITHMIC; // O(n log n)
  }

  // Check for heap sort patterns
  const hasHeapSort = lines.some((line) =>
    /heapify.*arr|heappop.*range|heappop.*len/.test(line)
  );
  if (hasHeapSort) {
    return TimeComplexityNotation.LINEARITHMIC; // O(n log n)
  }

  // Check for divide and conquer sorting patterns
  const hasDivideConquerSort = lines.some(
    (line) =>
      /quick_sort|merge_sort/.test(line) ||
      (/\[.*for.*if.*</.test(line) && /pivot/.test(line)) ||
      (/left.*=.*\[/.test(line) && /right.*=.*\[/.test(line))
  );
  if (hasDivideConquerSort) {
    return TimeComplexityNotation.LINEARITHMIC; // O(n log n)
  }

  // Check for manual sorting patterns (merge sort, quick sort)
  const hasMergeSort = lines.some((line) => /merge.*sort|merge\(/i.test(line));
  if (hasMergeSort) {
    return TimeComplexityNotation.LINEARITHMIC; // O(n log n)
  }

  // Check for logarithmic patterns (binary search, halving, math operations)
  const hasLogarithmic = lines.some(
    (line) =>
      // Division by 2 patterns
      /\/\/\s*2|\/\s*2|\*\s*2/.test(line) ||
      // Binary search patterns
      /(left|right).*=.*mid|mid.*=.*\(.*\+.*\)/.test(line) ||
      /while.*left.*<=.*right/.test(line) ||
      // Math logarithmic functions
      /math\.log|math\.ceil.*log|log2|log10/.test(line) ||
      // Heap operations
      /heappush|heappop|heapify/.test(line) ||
      // Binary tree operations
      /binary.*tree|tree.*height/.test(line.toLowerCase()) ||
      // Bit manipulation (counting bits)
      /while.*n:|n\s*\/\/\s*2|n\s*>>=|n\s*>>\s*1/.test(line)
  );

  // Special case: if we have logarithmic patterns but no loops, it's still O(log n)
  if (hasLogarithmic) {
    return TimeComplexityNotation.LOGARITHMIC; // O(log n)
  }

  // Determine complexity based on nesting
  switch (nestedCount) {
    case 0:
      return TimeComplexityNotation.CONSTANT; // O(1)
    case 1:
      return TimeComplexityNotation.LINEAR; // O(n)
    case 2:
      return TimeComplexityNotation.QUADRATIC; // O(n²)
    case 3:
      return TimeComplexityNotation.CUBIC; // O(n³)
    default:
      return `O(n^${nestedCount})`;
  }
}
