// Basic algorithmic pattern detection

// Detect constant time operations
export function detectConstantTime(line: string): boolean {
  const trimmed = line.trim();

  // Direct array/list access with index
  if (/\[\d+\]/.test(trimmed) || /\[-?\d+\]/.test(trimmed)) {
    return true;
  }

  // Dictionary/hash table access
  if (/\[.+\](?!\s*=\s*\[)/.test(trimmed) && !trimmed.includes("for")) {
    return true;
  }

  // Mathematical operations
  if (/^[a-zA-Z_]\w*\s*[+\-*/=]\s*/.test(trimmed)) {
    return true;
  }

  // Variable assignments (non-loop)
  if (/^[a-zA-Z_]\w*\s*=/.test(trimmed) && !trimmed.includes("for")) {
    return true;
  }

  // Basic comparisons
  if (/^if\s+[a-zA-Z_]\w*\s*[<>=!]/.test(trimmed)) {
    return true;
  }

  return false;
}

// Detect logarithmic time patterns
export function detectLogarithmic(line: string): boolean {
  const trimmed = line.trim();

  // Binary search patterns - halving search space
  if (/\/\/\s*2|\/\s*2|\*\s*2/.test(trimmed)) {
    return true;
  }

  // Common binary operations
  if (/(left|right|mid|middle|start|end).*\/\/\s*2/.test(trimmed)) {
    return true;
  }

  // Tree traversal patterns (going down one path)
  if (/\.(left|right)(?!\s*=)/.test(trimmed)) {
    return true;
  }

  // Heap operations
  if (/(heappush|heappop|heapify)/.test(trimmed)) {
    return true;
  }

  return false;
}

// Detect linear time operations
export function detectLinear(lines: string[]): boolean {
  // Check for single loops through input
  let loopCount = 0;
  let hasNestedLoop = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("for ") || line.startsWith("while ")) {
      loopCount++;

      // Check for nested loops in next few lines
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith("for ") || nextLine.startsWith("while ")) {
          hasNestedLoop = true;
          break;
        }
      }
    }
  }

  return loopCount === 1 && !hasNestedLoop;
}

// Check for built-in linear operations
export function hasLinearBuiltins(line: string): boolean {
  const linearFunctions = [
    "sum\\(",
    "max\\(",
    "min\\(",
    "len\\(",
    "\\.count\\(",
    "\\.index\\(",
    "\\.remove\\(",
    "list\\(",
    "tuple\\(",
    "set\\(",
  ];

  return linearFunctions.some((func) => new RegExp(func).test(line));
}
