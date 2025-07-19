import { TIME_COMPLEXITY_PRIORITIES } from "../constants/timeComplexityNotationsConst";

// Compare complexity TIME_COMPLEXITY_PRIORITIES (higher number = worse complexity)
export function compareComplexityPriority(
  complexity1: string,
  complexity2: string
): number {
  const priority1 = TIME_COMPLEXITY_PRIORITIES[complexity1] || 0;
  const priority2 = TIME_COMPLEXITY_PRIORITIES[complexity2] || 0;

  return priority1 - priority2;
}
