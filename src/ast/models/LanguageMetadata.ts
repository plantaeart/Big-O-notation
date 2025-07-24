/**
 * Language-specific metadata for complexity analysis
 */
export interface LanguageMetadata {
  name: string;
  fileExtensions: string[];
  builtinFunctions: {
    constant: string[]; // O(1) functions
    linear: string[]; // O(n) functions
    logarithmic: string[]; // O(log n) functions
    quadratic: string[]; // O(n²) functions
    sorting: string[]; // O(n log n) functions
  };
  loopKeywords: string[];
  functionKeywords: string[];
  conditionalKeywords: string[];
}

/**
 * Python language metadata
 */
export const PYTHON_METADATA: LanguageMetadata = {
  name: "python",
  fileExtensions: [".py", ".pyx", ".pyi"],
  builtinFunctions: {
    constant: [
      "len",
      "abs",
      "min",
      "max",
      "type",
      "isinstance",
      "hasattr",
      "getattr",
      "setattr",
    ],
    linear: ["sum", "list", "tuple", "set", "str", "repr"],
    logarithmic: ["bisect_left", "bisect_right", "heappush", "heappop"],
    quadratic: [],
    sorting: ["sorted", "sort"],
  },
  loopKeywords: ["for", "while"],
  functionKeywords: ["def", "async def"],
  conditionalKeywords: ["if", "elif", "else"],
};

/**
 * Complexity patterns for specific AST node types
 */
export interface ComplexityPattern {
  nodeType: string;
  complexity: string;
  confidence: number;
  conditions?: (node: any) => boolean;
}
