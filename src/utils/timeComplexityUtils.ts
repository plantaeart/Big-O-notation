import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";
import {
  detectConstantTime,
  detectLinear,
  detectLogarithmic,
} from "../patterns/basicPatterns";

// Get human-readable description for complexity
export function getTimeComplexityDescription(complexity: string): string {
  const descriptions: { [key: string]: string } = {
    [TimeComplexityNotation.CONSTANT]: "Constant time - excellent performance",
    [TimeComplexityNotation.LOGARITHMIC]:
      "Logarithmic time - very good performance",
    [TimeComplexityNotation.LINEAR]: "Linear time - good performance",
    [TimeComplexityNotation.LINEARITHMIC]:
      "Linearithmic time - acceptable performance",
    [TimeComplexityNotation.QUADRATIC]:
      "Quadratic time - poor performance for large inputs",
    [TimeComplexityNotation.CUBIC]: "Cubic time - very poor performance",
    [TimeComplexityNotation.EXPONENTIAL]:
      "Exponential time - impractical for large inputs",
    [TimeComplexityNotation.FACTORIAL]:
      "Factorial time - only suitable for very small inputs",
  };

  return descriptions[complexity] || "Unknown complexity";
}
// Calculate confidence in the analysis
export function calculateConfidence(
  lines: string[],
  complexity: string
): number {
  let confidence = 50; // Base confidence

  // Increase confidence for clear patterns
  if (
    complexity === TimeComplexityNotation.CONSTANT &&
    lines.every((line) => detectConstantTime(line) || line.trim() === "")
  ) {
    confidence = 95;
  } else if (
    complexity === TimeComplexityNotation.LOGARITHMIC &&
    lines.some((line) => detectLogarithmic(line))
  ) {
    confidence = 85;
  } else if (
    complexity === TimeComplexityNotation.LINEAR &&
    detectLinear(lines)
  ) {
    confidence = 90;
  } else if (complexity === TimeComplexityNotation.QUADRATIC) {
    const nestedLoops = lines.filter((line) =>
      /\s+for.*in.*:/.test(line)
    ).length;
    confidence = nestedLoops > 0 ? 85 : 70;
  } else if (complexity === TimeComplexityNotation.CUBIC) {
    const tripleLoops = lines.filter((line) => /for.*in.*:/.test(line)).length;
    confidence = tripleLoops >= 3 ? 90 : 75;
  } else if (complexity === TimeComplexityNotation.EXPONENTIAL) {
    const hasExponentialPatterns = lines.some((line) =>
      /2\*\*|pow\(2|fibonacci|subset|powerset/.test(line)
    );
    confidence = hasExponentialPatterns ? 90 : 75;
  } else if (complexity === TimeComplexityNotation.FACTORIAL) {
    const hasFactorialPatterns = lines.some((line) =>
      /factorial|permut|arrangement/.test(line)
    );
    confidence = hasFactorialPatterns ? 90 : 75;
  }

  // Decrease confidence for ambiguous cases
  if (lines.length < 3) {
    confidence -= 20;
  }

  return Math.max(10, Math.min(100, confidence));
}
