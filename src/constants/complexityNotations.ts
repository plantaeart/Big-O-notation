/**
 * Big-O Complexity Notations
 * Centralized enum for all complexity notation strings used throughout the application
 */
export enum ComplexityNotation {
  CONSTANT = "O(1)",
  LOGARITHMIC = "O(log n)",
  LINEAR = "O(n)",
  LINEARITHMIC = "O(n log n)",
  QUADRATIC = "O(n²)",
  CUBIC = "O(n³)",
  EXPONENTIAL = "O(2^n)",
  FACTORIAL = "O(n!)",
}

/**
 * Array of all complexity notations ordered from best to worst performance
 */
export const COMPLEXITY_ORDER = [
  ComplexityNotation.CONSTANT,
  ComplexityNotation.LOGARITHMIC,
  ComplexityNotation.LINEAR,
  ComplexityNotation.LINEARITHMIC,
  ComplexityNotation.QUADRATIC,
  ComplexityNotation.CUBIC,
  ComplexityNotation.EXPONENTIAL,
  ComplexityNotation.FACTORIAL,
] as const;

/**
 * Helper function to get all complexity notation values
 */
export function getAllComplexityNotations(): string[] {
  return Object.values(ComplexityNotation);
}

/**
 * Helper function to check if a string is a valid complexity notation
 */
export function isValidComplexityNotation(
  notation: string
): notation is ComplexityNotation {
  return Object.values(ComplexityNotation).includes(
    notation as ComplexityNotation
  );
}
