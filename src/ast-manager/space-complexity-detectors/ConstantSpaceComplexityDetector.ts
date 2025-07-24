import Parser from "tree-sitter";
import { SpaceComplexityPatternDetector } from "./SpaceComplexityPatternDetector";
import { ComplexityNode } from "../models/ComplexityNode";

/**
 * Detector for O(1) constant space complexity
 * Identifies functions that use constant space regardless of input size
 */
export class ConstantSpaceComplexityDetector extends SpaceComplexityPatternDetector {
  readonly notation = "O(1)";
  readonly confidence = 95;
  readonly priority = 1; // Lowest priority - check after other patterns

  detect(functionNode: Parser.SyntaxNode, parser: Parser): boolean {
    const functionBody = this.getFunctionBody(functionNode);
    if (!functionBody) {
      return false;
    }

    // Check for data structure creations
    const dataStructureCreations =
      this.findDataStructureCreations(functionBody);
    const dataStructureModifications =
      this.findDataStructureModifications(functionBody);

    // Check if any data structures grow with input
    const hasGrowingDataStructures =
      this.hasDataStructuresInLoops(functionBody);

    // O(1) space if:
    // 1. No data structure creations inside loops
    // 2. No data structure modifications inside loops
    // 3. Only uses variables/simple operations
    return (
      !hasGrowingDataStructures &&
      !this.hasDataStructureCreationsInLoops(functionBody) &&
      !this.hasRecursiveCallsWithDataStructures(functionBody)
    );
  }

  analyze(functionNode: Parser.SyntaxNode, parser: Parser): ComplexityNode {
    return {
      funcName: this.extractFunctionName(functionNode),
      hasParent: false,
      hasChild: false,
      parent: null,
      children: [],
      timeNotation: null,
      spaceNotation: this.notation,
      astNode: functionNode,
      forLoopCount: 0,
      whileLoopCount: 0,
      isNested: false,
      recursiveCallCount: 0,
      keywords: ["constant_space", "simple_variables"],
      depth: 0,
      confidence: this.confidence,
    };
  }

  /**
   * Extract function name from function definition node
   */
  private extractFunctionName(functionNode: Parser.SyntaxNode): string {
    for (let i = 0; i < functionNode.childCount; i++) {
      const child = functionNode.child(i);
      if (child && child.type === "identifier") {
        return child.text;
      }
    }
    return "unknown";
  }

  /**
   * Check if function has data structures that grow within loops
   */
  private hasDataStructuresInLoops(functionBody: Parser.SyntaxNode): boolean {
    const loops = this.findNodes(functionBody, [
      "for_statement",
      "while_statement",
    ]);

    for (const loop of loops) {
      const dataStructureOps = this.findDataStructureModifications(loop);
      if (dataStructureOps.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if function creates data structures inside loops
   */
  private hasDataStructureCreationsInLoops(
    functionBody: Parser.SyntaxNode
  ): boolean {
    const loops = this.findNodes(functionBody, [
      "for_statement",
      "while_statement",
    ]);

    for (const loop of loops) {
      const dataStructureCreations = this.findDataStructureCreations(loop);
      if (dataStructureCreations.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if function has recursive calls that might accumulate space
   */
  private hasRecursiveCallsWithDataStructures(
    functionBody: Parser.SyntaxNode
  ): boolean {
    const calls = this.findNodes(functionBody, ["call"]);

    // Simple heuristic: check for function calls with data structure arguments
    for (const call of calls) {
      const text = call.text;
      if (/\w+\s*\(\s*\[/.test(text) || /\w+\s*\(\s*\{/.test(text)) {
        return true;
      }
    }

    return false;
  }
}
