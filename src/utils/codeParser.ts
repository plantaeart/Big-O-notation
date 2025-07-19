// Utility functions for code parsing and analysis

// Helper function to get indentation level
export function getIndentLevel(line: string): number {
  let indent = 0;
  for (const char of line) {
    if (char === " ") {
      indent++;
    } else if (char === "\t") {
      indent += 4; // Count tab as 4 spaces
    } else {
      break;
    }
  }
  return indent;
}

// Helper function to get indentation from a line
export function getIndentFromLine(lineText: string): string {
  const match = lineText.match(/^(\s*)/);
  return match ? match[1] : "";
}

// Helper function to detect function definitions
export function isFunctionDefinition(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("def ") && trimmed.includes("(") && trimmed.endsWith(":")
  );
}

// Helper function to extract function name from definition
export function extractFunctionName(line: string): string {
  const trimmed = line.trim();
  const defIndex = trimmed.indexOf("def ");
  const parenIndex = trimmed.indexOf("(");
  if (defIndex !== -1 && parenIndex !== -1) {
    return trimmed.substring(defIndex + 4, parenIndex).trim();
  }
  return "";
}

// Helper function to count function calls in a line
export function countFunctionCalls(line: string, functionName: string): number {
  let count = 0;
  let index = 0;

  while ((index = line.indexOf(functionName + "(", index)) !== -1) {
    // Check if it's a valid function call (not part of another identifier)
    const beforeChar = index > 0 ? line[index - 1] : " ";
    const isValidCall = /[\s\(\)\[\]\{\},;=+\-*/!<>]/.test(beforeChar);

    if (isValidCall) {
      count++;
    }
    index += functionName.length + 1;
  }

  return count;
}

// Helper function to detect list comprehensions which are also loops
export function isListComprehension(line: string): boolean {
  return (
    (line.includes("[") &&
      line.includes("for") &&
      line.includes("in") &&
      line.includes("]")) ||
    (line.includes("(") &&
      line.includes("for") &&
      line.includes("in") &&
      line.includes(")"))
  );
}

// Helper function to detect loop statements
export function isLoopStatement(line: string): boolean {
  const trimmed = line.trim();

  // Match for loop patterns
  if (trimmed.startsWith("for ")) {
    // Check if it's a proper for loop (has 'in' keyword)
    return trimmed.includes(" in ") && trimmed.endsWith(":");
  }

  // Match while loop patterns
  if (trimmed.startsWith("while ")) {
    // Check if it's a proper while loop (has ':' at the end)
    return trimmed.endsWith(":");
  }

  return false;
}
