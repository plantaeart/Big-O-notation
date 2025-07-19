import { TimeComplexityNotation } from "../constants/timeComplexityNotationsConst";
import { complexityToNumeric } from "../utils/complexityHelperUtils";
import { getTimeComplexityDescription } from "../utils/timeComplexityUtils";
import { FunctionComplexity } from "../models/FunctionComplexity.model";
import { ComplexityResult } from "../models/ComplexityResult.model";
import { SpaceComplexityResult } from "../models/SpaceComplexityResult.model";

export class ParentFunctionComplexity extends FunctionComplexity {
  public childFunctions: FunctionComplexity[] = [];

  constructor(
    functionName: string,
    timeComplexity: ComplexityResult,
    spaceComplexity: SpaceComplexityResult
  ) {
    super(functionName, timeComplexity, spaceComplexity);
  }

  addChild(childFunction: FunctionComplexity): void {
    this.childFunctions.push(childFunction);
  }

  /**
   * Calculate the final complexity by taking the worst complexity among all children
   * Parent inherits the highest complexity from any of its children
   */
  calculateFinalComplexity(): void {
    if (this.childFunctions.length === 0) {
      // No children, keep original complexity
      return;
    }

    // Find the worst complexity among all children
    let worstChildComplexity: string = TimeComplexityNotation.CONSTANT;
    let worstChildSpaceComplexity: string = TimeComplexityNotation.CONSTANT;

    for (const child of this.childFunctions) {
      const childTimeComplexity = child.timeComplexity.notation;
      const childSpaceComplexity = child.spaceComplexity.notation;

      // Check if this child has worse time complexity
      if (
        complexityToNumeric(childTimeComplexity) >
        complexityToNumeric(worstChildComplexity)
      ) {
        worstChildComplexity = childTimeComplexity;
      }

      // Check if this child has worse space complexity
      if (
        complexityToNumeric(childSpaceComplexity) >
        complexityToNumeric(worstChildSpaceComplexity)
      ) {
        worstChildSpaceComplexity = childSpaceComplexity;
      }
    }

    // Parent inherits the worst complexity from children
    // Compare parent's own complexity with worst child complexity
    const parentOwnTimeComplexity = this.timeComplexity.notation;
    const parentOwnSpaceComplexity = this.spaceComplexity.notation;

    // Take the worst between parent's own complexity and worst child complexity
    const finalTimeComplexity =
      complexityToNumeric(worstChildComplexity) >
      complexityToNumeric(parentOwnTimeComplexity)
        ? worstChildComplexity
        : parentOwnTimeComplexity;

    const finalSpaceComplexity =
      complexityToNumeric(worstChildSpaceComplexity) >
      complexityToNumeric(parentOwnSpaceComplexity)
        ? worstChildSpaceComplexity
        : parentOwnSpaceComplexity;

    // Update parent's complexity if needed
    if (finalTimeComplexity !== parentOwnTimeComplexity) {
      console.log(
        `${this.functionName}: Inheriting time complexity ${finalTimeComplexity} from children (was ${parentOwnTimeComplexity})`
      );
      this.timeComplexity = {
        notation: finalTimeComplexity,
        description: getTimeComplexityDescription(finalTimeComplexity),
        confidence: Math.max(this.timeComplexity.confidence - 10, 70),
      };
    }

    if (finalSpaceComplexity !== parentOwnSpaceComplexity) {
      console.log(
        `${this.functionName}: Inheriting space complexity ${finalSpaceComplexity} from children (was ${parentOwnSpaceComplexity})`
      );
      this.spaceComplexity = {
        notation: finalSpaceComplexity,
        description: getTimeComplexityDescription(finalSpaceComplexity),
        confidence: Math.max(this.spaceComplexity.confidence - 10, 70),
        dataStructures: this.spaceComplexity.dataStructures,
      };
    }
  }

  /**
   * Get a summary of all child complexities for debugging
   */
  getChildComplexitySummary(): string {
    if (this.childFunctions.length === 0) {
      return "No child functions";
    }

    const childSummaries = this.childFunctions.map(
      (child) =>
        `${child.functionName}: T(${child.timeComplexity.notation}), S(${child.spaceComplexity.notation})`
    );

    return `Children: ${childSummaries.join(", ")}`;
  }
}

export class ComplexityHierarchyManager {
  private functions: Map<string, ParentFunctionComplexity> = new Map();

  /**
   * Add a function to the hierarchy
   */
  addFunction(
    functionName: string,
    timeComplexity: ComplexityResult,
    spaceComplexity: SpaceComplexityResult
  ): void {
    const functionComplexity = new ParentFunctionComplexity(
      functionName,
      timeComplexity,
      spaceComplexity
    );
    this.functions.set(functionName, functionComplexity);
  }

  /**
   * Add a child relationship between functions
   */
  addChildRelationship(parentName: string, childName: string): void {
    const parent = this.functions.get(parentName);
    const child = this.functions.get(childName);

    if (parent && child) {
      // Create a FunctionComplexity instance for the child
      const childFunction = new FunctionComplexity(
        child.functionName,
        child.timeComplexity,
        child.spaceComplexity
      );
      parent.addChild(childFunction);
      console.log(`Added ${childName} as child of ${parentName}`);
    } else {
      console.warn(
        `Cannot add child relationship: ${parentName} or ${childName} not found`
      );
    }
  }

  /**
   * Process all functions in dependency order (children first, then parents)
   */
  processComplexityInheritance(dependencies: Map<string, string[]>): void {
    // Topological sort to process children before parents
    const visited = new Set<string>();
    const processing = new Set<string>();

    const processFunction = (functionName: string): void => {
      if (visited.has(functionName) || processing.has(functionName)) {
        return;
      }

      processing.add(functionName);

      // First process all children (dependencies)
      const children = dependencies.get(functionName) || [];
      for (const childName of children) {
        if (this.functions.has(childName)) {
          processFunction(childName);
        }
      }

      // Now process this function
      const func = this.functions.get(functionName);
      if (func) {
        // Add child relationships
        for (const childName of children) {
          this.addChildRelationship(functionName, childName);
        }

        // Calculate final complexity based on children
        func.calculateFinalComplexity();

        console.log(
          `Processed ${functionName}: Final T(${func.timeComplexity.notation}), S(${func.spaceComplexity.notation})`
        );
        console.log(`  ${func.getChildComplexitySummary()}`);
      }

      processing.delete(functionName);
      visited.add(functionName);
    };

    // Process all functions
    for (const functionName of this.functions.keys()) {
      processFunction(functionName);
    }
  }

  /**
   * Get the final complexity for a function
   */
  getFunctionComplexity(functionName: string): ParentFunctionComplexity | null {
    return this.functions.get(functionName) || null;
  }

  /**
   * Get all functions in the hierarchy
   */
  getAllFunctions(): ParentFunctionComplexity[] {
    return Array.from(this.functions.values());
  }
}
