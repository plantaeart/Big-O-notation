import { PythonKeywords } from "../constants/pythonKeyWordsConst";
import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";

// Get description for space complexity
export function getSpaceComplexityDescription(complexity: string): string {
  const descriptions: { [key: string]: string } = {
    "O(1)": "Constant space - uses fixed amount of memory",
    "O(log n)": "Logarithmic space - typically from recursion depth",
    "O(n)": "Linear space - memory usage grows with input size",
    "O(n²)": "Quadratic space - often from 2D data structures",
    "O(n³)": "Cubic space - typically from 3D data structures",
    "O(2^n)": "Exponential space - often from generating all subsets",
    "O(n!)": "Factorial space - often from generating all permutations",
  };

  return descriptions[complexity] || "Unknown space complexity";
}

// Get space complexity for a variable creation
export function getVariableSpaceComplexity(line: string): {
  type: string;
  complexity: string;
} {
  // Arrays/lists of size n
  if (/\[\s*\]\s*\*\s*\w+|\[\s*.*for.*in.*\]/.test(line)) {
    return {
      type: PythonKeywords.LIST,
      complexity: TimeComplexityNotation.LINEAR,
    };
  }

  // 2D arrays/matrices
  if (/\[\s*\[\s*\]\s*for.*in.*\]|\[\s*\]\s*\*\s*\w+\s*for/.test(line)) {
    return {
      type: PythonKeywords.MATRIX,
      complexity: TimeComplexityNotation.QUADRATIC,
    };
  }

  // Dictionaries/hash tables
  if (/\{\s*\}|dict\(/.test(line)) {
    return {
      type: PythonKeywords.DICTIONARY,
      complexity: TimeComplexityNotation.LINEAR,
    };
  }

  // Sets
  if (/set\(/.test(line)) {
    return {
      type: PythonKeywords.SET,
      complexity: TimeComplexityNotation.LINEAR,
    };
  }

  // String operations that create new strings
  if (/\+.*str|\*.*str|join\(/.test(line)) {
    return {
      type: PythonKeywords.STRING,
      complexity: TimeComplexityNotation.LINEAR,
    };
  }

  // Simple variables
  return {
    type: PythonKeywords.VARIABLE,
    complexity: TimeComplexityNotation.CONSTANT,
  };
}
