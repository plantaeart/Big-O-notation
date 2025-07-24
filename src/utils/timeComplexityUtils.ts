import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";

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
    [TimeComplexityNotation.EXPONENTIAL_K]:
      "Exponential k^n time - extremely impractical for large inputs",
    [TimeComplexityNotation.FACTORIAL]:
      "Factorial time - only suitable for very small inputs",
  };

  return descriptions[complexity] || "Unknown complexity";
}
