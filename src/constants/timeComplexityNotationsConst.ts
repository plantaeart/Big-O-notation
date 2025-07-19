/**
 * Big-O Complexity Notations
 * Centralized enum for all complexity notation strings used throughout the application
 */
export enum TimeComplexityNotation {
  CONSTANT = "O(1)",
  LOGARITHMIC = "O(log n)",
  LINEAR = "O(n)",
  LINEARITHMIC = "O(n log n)",
  QUADRATIC = "O(n²)",
  CUBIC = "O(n³)",
  EXPONENTIAL = "O(2^n)",
  EXPONENTIAL_K = "O(k^n)",
  FACTORIAL = "O(n!)",
}

export const TIME_COMPLEXITY_PRIORITIES: { [key: string]: number } = {
  [TimeComplexityNotation.CONSTANT]: 1,
  [TimeComplexityNotation.LOGARITHMIC]: 2,
  [TimeComplexityNotation.LINEAR]: 3,
  [TimeComplexityNotation.LINEARITHMIC]: 4,
  [TimeComplexityNotation.QUADRATIC]: 5,
  [TimeComplexityNotation.CUBIC]: 6,
  [TimeComplexityNotation.EXPONENTIAL]: 7,
  [TimeComplexityNotation.EXPONENTIAL_K]: 8,
  [TimeComplexityNotation.FACTORIAL]: 9,
};
