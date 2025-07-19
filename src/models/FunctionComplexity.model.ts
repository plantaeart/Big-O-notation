import { ComplexityResult } from "./ComplexityResult.model";
import { SpaceComplexityResult } from "./SpaceComplexityResult.model";

export class FunctionComplexity {
  public timeComplexity: ComplexityResult;
  public spaceComplexity: SpaceComplexityResult;
  public functionName: string;

  constructor(
    functionName: string,
    timeComplexity: ComplexityResult,
    spaceComplexity: SpaceComplexityResult
  ) {
    this.functionName = functionName;
    this.timeComplexity = timeComplexity;
    this.spaceComplexity = spaceComplexity;
  }
}
