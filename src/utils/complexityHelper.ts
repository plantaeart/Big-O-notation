import { ComplexityNotation } from "../constants/complexityNotations";
import { ComplexityResult } from "../types";

// Internal function to get text indicator for any complexity type
function getComplexityEmojiInternal(complexity: string): string {
  // Normalize the complexity string to handle potential variations
  const normalizedComplexity = complexity.trim();

  // Use text indicators that can be styled by VS Code themes
  switch (normalizedComplexity) {
    case ComplexityNotation.CONSTANT:
      return "EXCELLENT"; // Can be styled green
    case ComplexityNotation.LOGARITHMIC:
    case ComplexityNotation.LINEAR:
      return "GOOD"; // Can be styled yellow/green
    case ComplexityNotation.LINEARITHMIC:
      return "FAIR"; // Can be styled orange
    case ComplexityNotation.QUADRATIC:
    case ComplexityNotation.CUBIC:
      return "POOR"; // Can be styled red
    case ComplexityNotation.EXPONENTIAL:
      return "BAD"; // Can be styled dark red
    case ComplexityNotation.FACTORIAL:
      return "TERRIBLE"; // Can be styled dark red/black
    default:
      return "UNKNOWN"; // Can be styled gray
  }
}

// Get emoji indicator for time complexity
export function getComplexityEmoji(complexity: string): string {
  // Debug logging for specific cases
  if (complexity.trim() === ComplexityNotation.EXPONENTIAL) {
    console.log(`Mapping ${ComplexityNotation.EXPONENTIAL} to purple emoji: �`);
  }

  return getComplexityEmojiInternal(complexity);
}

// Get space complexity emoji indicator
export function getSpaceComplexityEmoji(spaceComplexity: string): string {
  return getComplexityEmojiInternal(spaceComplexity);
}

// Format complexity result for display
export function formatComplexityResult(result: ComplexityResult): string {
  const timeEmoji = getComplexityEmoji(result.notation);

  return `${timeEmoji} ${result.notation} - ${result.description}`;
}

// Combine multiple complexities using worst-case analysis
export function combineComplexities(complexities: string[]): string {
  if (complexities.length === 0) {
    return ComplexityNotation.CONSTANT;
  }

  // Priority order from worst to best
  const priority: { [key: string]: number } = {
    [ComplexityNotation.FACTORIAL]: 8,
    [ComplexityNotation.EXPONENTIAL]: 7,
    [ComplexityNotation.CUBIC]: 6,
    [ComplexityNotation.QUADRATIC]: 5,
    [ComplexityNotation.LINEARITHMIC]: 4,
    [ComplexityNotation.LINEAR]: 3,
    [ComplexityNotation.LOGARITHMIC]: 2,
    [ComplexityNotation.CONSTANT]: 1,
  };

  let worstComplexity: string = ComplexityNotation.CONSTANT;
  let worstPriority = 1;

  for (const complexity of complexities) {
    const currentPriority = priority[complexity] || 1;
    if (currentPriority > worstPriority) {
      worstComplexity = complexity;
      worstPriority = currentPriority;
    }
  }

  return worstComplexity;
}

// Check if a complexity is exponential or worse
export function isExponentialOrWorse(complexity: string): boolean {
  return (
    complexity === ComplexityNotation.EXPONENTIAL ||
    complexity === ComplexityNotation.FACTORIAL
  );
}

// Check if a complexity is polynomial
export function isPolynomial(complexity: string): boolean {
  return [
    ComplexityNotation.CONSTANT,
    ComplexityNotation.LOGARITHMIC,
    ComplexityNotation.LINEAR,
    ComplexityNotation.LINEARITHMIC,
    ComplexityNotation.QUADRATIC,
    ComplexityNotation.CUBIC,
  ].includes(complexity as ComplexityNotation);
}

// Convert complexity to numeric value for comparison
export function complexityToNumeric(complexity: string): number {
  const mapping: { [key: string]: number } = {
    [ComplexityNotation.CONSTANT]: 1,
    [ComplexityNotation.LOGARITHMIC]: 2,
    [ComplexityNotation.LINEAR]: 3,
    [ComplexityNotation.LINEARITHMIC]: 4,
    [ComplexityNotation.QUADRATIC]: 5,
    [ComplexityNotation.CUBIC]: 6,
    [ComplexityNotation.EXPONENTIAL]: 7,
    [ComplexityNotation.FACTORIAL]: 8,
  };
  return mapping[complexity] || 0;
}
