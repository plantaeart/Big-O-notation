import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";
import { SpaceComplexityResult } from "../types";
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

// Analyze space complexity of code
export function analyzeSpaceComplexity(lines: string[]): SpaceComplexityResult {
  const dataStructures: string[] = [];
  let maxSpaceComplexity = TimeComplexityNotation.CONSTANT as string;
  let confidence = 80;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for data structure creation
    if (isVariableCreation(trimmed)) {
      const spaceInfo = getVariableSpaceComplexity(trimmed);
      dataStructures.push(spaceInfo.type);

      if (
        compareComplexityPriority(spaceInfo.complexity, maxSpaceComplexity) > 0
      ) {
        maxSpaceComplexity = spaceInfo.complexity;
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
  }

  return {
    notation: maxSpaceComplexity,
    description: getSpaceComplexityDescription(maxSpaceComplexity),
    confidence: Math.min(100, confidence),
    dataStructures: [...new Set(dataStructures)], // Remove duplicates
  };
}
