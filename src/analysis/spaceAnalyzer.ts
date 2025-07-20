import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";
import { compareComplexityPriority } from "../utils/timeComplexityComparatorUtils";
import {
  getSpaceComplexityDescription,
  getVariableSpaceComplexity,
} from "../utils/spaceComplexityUtils";
import {
  isInPlaceOperation,
  isRecursiveCall,
  isVariableCreation,
} from "../utils/codeParserUtils";
import { SpaceComplexityResult } from "../models/SpaceComplexityResult.model";

// Analyze space complexity of code
export function analyzeSpaceComplexity(lines: string[]): SpaceComplexityResult {
  const dataStructures: string[] = [];
  let maxSpaceComplexity = TimeComplexityNotation.CONSTANT as string;
  let confidence = 80;

  // Track variables that are created as empty and then populated in loops
  const emptyListVariables = new Set<string>();
  let inLoop = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if we're entering a loop
    if (/^\s*(for|while)\s+/.test(trimmed)) {
      inLoop = true;
    }

    // Check for data structure creation
    if (isVariableCreation(trimmed)) {
      const spaceInfo = getVariableSpaceComplexity(trimmed);

      // Special case: detect empty list creation
      if (/^\s*\w+\s*=\s*\[\s*\]\s*$/.test(trimmed)) {
        const varName = trimmed.split("=")[0].trim();
        emptyListVariables.add(varName);
        console.log(`Found empty list creation: ${varName}`);
      }

      dataStructures.push(spaceInfo.type);

      if (
        compareComplexityPriority(spaceInfo.complexity, maxSpaceComplexity) > 0
      ) {
        maxSpaceComplexity = spaceInfo.complexity;
      }
    }

    // Check for append operations on empty lists within loops
    if (inLoop && /\.append\(/.test(trimmed)) {
      const varName = trimmed.split(".")[0].trim();
      if (emptyListVariables.has(varName)) {
        console.log(`Found O(n) space pattern: ${varName} populated in loop`);
        if (
          compareComplexityPriority(
            TimeComplexityNotation.LINEAR,
            maxSpaceComplexity
          ) > 0
        ) {
          maxSpaceComplexity = TimeComplexityNotation.LINEAR;
          dataStructures.push("dynamic list growth");
        }
      }
    }

    // Check for recursive calls (stack space)
    if (isRecursiveCall(trimmed)) {
      if (
        compareComplexityPriority(
          TimeComplexityNotation.LINEAR,
          maxSpaceComplexity
        ) > 0
      ) {
        maxSpaceComplexity = TimeComplexityNotation.LINEAR;
      }
      dataStructures.push("recursion stack");
    }

    // Check for in-place operations
    if (isInPlaceOperation(trimmed)) {
      confidence += 10;
    }

    // Reset loop flag at end of block (simple heuristic)
    if (inLoop && /^\s*$/.test(trimmed) && i < lines.length - 1) {
      const nextLine = lines[i + 1];
      if (
        !/^\s{4,}/.test(nextLine) &&
        !/^\s*(for|while|if|elif|else)/.test(nextLine.trim())
      ) {
        inLoop = false;
      }
    }
  }

  return {
    notation: maxSpaceComplexity,
    description: getSpaceComplexityDescription(maxSpaceComplexity),
    confidence: Math.min(100, confidence),
    dataStructures: [...new Set(dataStructures)], // Remove duplicates
  };
}
