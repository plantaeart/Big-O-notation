import { SpaceComplexityResult } from "../types";

// Analyze space complexity of code
export function analyzeSpaceComplexity(lines: string[]): SpaceComplexityResult {
  const dataStructures: string[] = [];
  let maxSpaceComplexity = "O(1)";
  let confidence = 80;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for data structure creation
    if (isVariableCreation(trimmed)) {
      const spaceInfo = getVariableSpaceComplexity(trimmed);
      dataStructures.push(spaceInfo.type);

      if (compareComplexity(spaceInfo.complexity, maxSpaceComplexity) > 0) {
        maxSpaceComplexity = spaceInfo.complexity;
      }
    }

    // Check for recursive calls (stack space)
    if (isRecursiveCall(trimmed)) {
      if (compareComplexity("O(n)", maxSpaceComplexity) > 0) {
        maxSpaceComplexity = "O(n)";
      }
      dataStructures.push("recursion stack");
    }

    // Check for in-place operations
    if (isInPlaceOperation(trimmed)) {
      confidence += 10;
    }
  }

  return {
    notation: maxSpaceComplexity,
    description: getSpaceComplexityDescription(maxSpaceComplexity),
    confidence: Math.min(100, confidence),
    dataStructures: [...new Set(dataStructures)], // Remove duplicates
  };
}

// Check if line creates a variable/data structure
function isVariableCreation(line: string): boolean {
  return /^\s*\w+\s*=/.test(line) && !line.includes("==");
}

// Get space complexity for a variable creation
function getVariableSpaceComplexity(line: string): {
  type: string;
  complexity: string;
} {
  // Arrays/lists of size n
  if (/\[\s*\]\s*\*\s*\w+|\[\s*.*for.*in.*\]/.test(line)) {
    return { type: "list", complexity: "O(n)" };
  }

  // 2D arrays/matrices
  if (/\[\s*\[\s*\]\s*for.*in.*\]|\[\s*\]\s*\*\s*\w+\s*for/.test(line)) {
    return { type: "matrix", complexity: "O(n²)" };
  }

  // Dictionaries/hash tables
  if (/\{\s*\}|dict\(/.test(line)) {
    return { type: "dictionary", complexity: "O(n)" };
  }

  // Sets
  if (/set\(/.test(line)) {
    return { type: "set", complexity: "O(n)" };
  }

  // String operations that create new strings
  if (/\+.*str|\*.*str|join\(/.test(line)) {
    return { type: "string", complexity: "O(n)" };
  }

  // Simple variables
  return { type: "variable", complexity: "O(1)" };
}

// Check if line has recursive function call
function isRecursiveCall(line: string): boolean {
  // Look for function calls that might be recursive
  return /\w+\(.*\w+.*[-+*/]\s*\d+.*\)/.test(line);
}

// Check if operation is in-place
function isInPlaceOperation(line: string): boolean {
  // Operations that modify existing data structures
  return /\.append\(|\.pop\(|\.sort\(|\.reverse\(|\[\s*\w+\s*\]\s*=/.test(line);
}

// Compare two complexity notations
function compareComplexity(complexity1: string, complexity2: string): number {
  const order = [
    "O(1)",
    "O(log n)",
    "O(n)",
    "O(n log n)",
    "O(n²)",
    "O(n³)",
    "O(2^n)",
    "O(n!)",
  ];
  const index1 = order.indexOf(complexity1);
  const index2 = order.indexOf(complexity2);

  if (index1 === -1) {
    return -1;
  }
  if (index2 === -1) {
    return 1;
  }

  return index1 - index2;
}

// Get description for space complexity
function getSpaceComplexityDescription(complexity: string): string {
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
