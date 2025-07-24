/**
 * Algorithm Keywords Constants
 * Centralized keyword collections for complexity pattern detection
 */

export const ALGORITHM_KEYWORDS = {
  // Binary Search and Logarithmic Algorithms
  BINARY_SEARCH: ["binary", "search", "bisect", "find"],

  // Heap Operations
  HEAP: ["heap", "heappush", "heappop", "heapify", "priority"],

  // Sorting Algorithms
  SORTING: ["sort", "sorted", "merge", "quick", "heap"],
  SIMPLE_SORTING: ["bubble", "selection", "insertion"],

  // Mathematical Operations
  MATH_OPERATORS: ["+", "-", "*", "/", "%", "//", "**"],
  MATH_FUNCTIONS: [
    "add",
    "subtract",
    "multiply",
    "divide",
    "mod",
    "abs",
    "max",
    "min",
    "round",
    "floor",
    "ceil",
    "sqrt",
    "pow",
  ],

  // Direct Access and Cache Operations
  DIRECT_ACCESS: [
    "get",
    "set",
    "access",
    "index",
    "key",
    "hash",
    "dict",
    "map",
  ],

  // Constant Time Indicators
  CONSTANT_INDICATORS: [
    "constant",
    "o1",
    "direct",
    "immediate",
    "instant",
    "cache",
    "lookup",
    "hash",
    "map",
    "dict",
  ],

  // Loop Control Keywords
  CONSTANT_LOOP: ["keywords", "constant", "fixed"],

  // Recursive and Exponential Patterns
  EXPONENTIAL_CHOICES: ["include", "exclude", "choice", "binary", "two"],

  // Factorial and Permutation Patterns
  PERMUTATION: ["permutation", "factorial", "arrangement"],
  BACKTRACKING: ["queens", "tsp", "salesman", "combination", "backtrack"],

  // Space Complexity Keywords
  SPACE_LINEAR: ["linear_space", "data_structure_growth", "list_comprehension"],
  SPACE_CONSTANT: ["constant_space", "simple_variables"],
  SPACE_COMPREHENSIONS: [
    "list_comprehension",
    "dictionary_comprehension",
    "set_comprehension",
  ],
} as const;

/**
 * Regex patterns for common algorithmic structures
 */
export const ALGORITHM_PATTERNS = {
  // Constant loop patterns
  CONSTANT_FOR_LOOP: /for\s+\w+\s+in\s+\[.*\]/, // for item in ['a', 'b', 'c']

  // Range patterns
  RANGE_PATTERN: /range\s*\(/,
  RANGE_WITH_LEN: /range\s*\(\s*len\s*\(/,

  // Binary search patterns
  HALVING_OPERATION: /(\/\/\s*2|>>|\/\s*2)/,
  MID_CALCULATION: /(left\s*\+\s*right)\s*(\/\/|\/)\s*2/,

  // Matrix access patterns
  MATRIX_ACCESS: /\[\s*\w+\s*\]\s*\[\s*\w+\s*\]/,

  // Function call patterns
  RECURSIVE_CALL: /\w+\s*\(/,

  // Array/List operations
  ARRAY_INDEXING: /\[\s*\d+\s*\]|\[\s*\w+\s*\]/,
  SLICE_OPERATION: /\[\s*\w*\s*:\s*\w*\s*\]/,
} as const;
