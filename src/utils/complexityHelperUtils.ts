import { COMPLEXITY_INDICATOR } from "../constants/complexityIndicatorsConst";
import {
  TimeComplexityNotation,
  TIME_COMPLEXITY_PRIORITIES,
} from "../constants/timeComplexityNotationsConst";
import { ComplexityResult } from "../models/ComplexityResult.model";

// Internal function to get text indicator for any complexity type
function getComplexityIndicatorInternal(complexity: string): string {
  // Normalize the complexity string to handle potential variations
  const normalizedComplexity = complexity.trim();

  // Use text indicators that can be styled by VS Code themes
  switch (normalizedComplexity) {
    case TimeComplexityNotation.CONSTANT:
      return COMPLEXITY_INDICATOR.EXCELLENT; // Can be styled green
    case TimeComplexityNotation.LOGARITHMIC:
    case TimeComplexityNotation.LINEAR:
      return COMPLEXITY_INDICATOR.GOOD; // Can be styled yellow/green
    case TimeComplexityNotation.LINEARITHMIC:
      return COMPLEXITY_INDICATOR.FAIR; // Can be styled orange
    case TimeComplexityNotation.QUADRATIC:
    case TimeComplexityNotation.CUBIC:
      return COMPLEXITY_INDICATOR.POOR; // Can be styled red
    case TimeComplexityNotation.EXPONENTIAL:
      return COMPLEXITY_INDICATOR.BAD; // Can be styled dark red
    case TimeComplexityNotation.FACTORIAL:
      return COMPLEXITY_INDICATOR.TERRIBLE; // Can be styled dark red/black
    default:
      return COMPLEXITY_INDICATOR.UNKNOWN; // Can be styled gray
  }
}

// Get text indicator for time complexity
export function getComplexityIndicator(complexity: string): string {
  return getComplexityIndicatorInternal(complexity);
}

// Get space complexity text indicator
export function getSpaceComplexityIndicator(spaceComplexity: string): string {
  return getComplexityIndicatorInternal(spaceComplexity);
}

// Format complexity result for display
export function formatComplexityResult(result: ComplexityResult): string {
  const timeIndicator = getComplexityIndicator(result.notation);

  return `${timeIndicator} ${result.notation} - ${result.description}`;
}

// Combine multiple complexities using worst-case analysis
export function combineComplexities(complexities: string[]): string {
  if (complexities.length === 0) {
    return TimeComplexityNotation.CONSTANT;
  }

  let worstComplexity: string = TimeComplexityNotation.CONSTANT;
  let worstPriority = 1;

  for (const complexity of complexities) {
    const currentPriority = TIME_COMPLEXITY_PRIORITIES[complexity] || 1;
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
    complexity === TimeComplexityNotation.EXPONENTIAL ||
    complexity === TimeComplexityNotation.FACTORIAL
  );
}

// Check if a complexity is polynomial
export function isPolynomial(complexity: string): boolean {
  return [
    TimeComplexityNotation.CONSTANT,
    TimeComplexityNotation.LOGARITHMIC,
    TimeComplexityNotation.LINEAR,
    TimeComplexityNotation.LINEARITHMIC,
    TimeComplexityNotation.QUADRATIC,
    TimeComplexityNotation.CUBIC,
  ].includes(complexity as TimeComplexityNotation);
}

// Convert complexity to numeric value for comparison
export function complexityToNumeric(complexity: string): number {
  const mapping: { [key: string]: number } = {
    [TimeComplexityNotation.CONSTANT]: 1,
    [TimeComplexityNotation.LOGARITHMIC]: 2,
    [TimeComplexityNotation.LINEAR]: 3,
    [TimeComplexityNotation.LINEARITHMIC]: 4,
    [TimeComplexityNotation.QUADRATIC]: 5,
    [TimeComplexityNotation.CUBIC]: 6,
    [TimeComplexityNotation.EXPONENTIAL]: 7,
    [TimeComplexityNotation.FACTORIAL]: 8,
  };
  return mapping[complexity] || 0;
}
