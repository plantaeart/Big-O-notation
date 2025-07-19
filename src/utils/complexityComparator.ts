import { ComplexityNotation } from "../constants/complexityNotations";

// Compare complexity priorities (higher number = worse complexity)
export function compareComplexityPriority(
  complexity1: string,
  complexity2: string
): number {
  const priorities: { [key: string]: number } = {
    [ComplexityNotation.CONSTANT]: 1,
    [ComplexityNotation.LOGARITHMIC]: 2,
    [ComplexityNotation.LINEAR]: 3,
    [ComplexityNotation.LINEARITHMIC]: 4,
    [ComplexityNotation.QUADRATIC]: 5,
    [ComplexityNotation.CUBIC]: 6,
    [ComplexityNotation.EXPONENTIAL]: 7,
    [ComplexityNotation.FACTORIAL]: 8,
  };

  const priority1 = priorities[complexity1] || 0;
  const priority2 = priorities[complexity2] || 0;

  return priority1 - priority2;
}
