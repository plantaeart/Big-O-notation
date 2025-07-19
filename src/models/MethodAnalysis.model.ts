import { ComplexityResult } from "./ComplexityResult.model";
import { SpaceComplexityResult } from "./SpaceComplexityResult.model";

export interface MethodAnalysis {
  name: string;
  lineStart: number;
  lineEnd: number;
  complexity: ComplexityResult;
  spaceComplexity: SpaceComplexityResult;
  explanation: string;
}
