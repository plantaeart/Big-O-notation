import Parser from "tree-sitter";
import { SpaceComplexityPatternDetector } from "./SpaceComplexityPatternDetector";
import { ComplexityNode } from "../../models/ComplexityNode";
import { TimeComplexityNotation } from "../../constants/timeComplexityNotationsConst";

/**
 * Detector for O(n) linear space complexity
 * Identifies functions that use space proportional to input size
 */
export class LinearSpaceComplexityDetector extends SpaceComplexityPatternDetector {
  readonly notation = TimeComplexityNotation.LINEAR;
  readonly confidence = 90;
  readonly priority = 10; // Higher priority than O(1)

  detect(functionNode: Parser.SyntaxNode, parser: Parser): boolean {
    const functionBody = this.getFunctionBody(functionNode);
    if (!functionBody) {
      return false;
    }

    // Check for patterns that indicate O(n) space:
    // 1. Data structures created and populated in single loop
    // 2. List comprehensions
    // 3. Recursive calls with accumulator
    return (
      this.hasLinearDataStructureGrowth(functionBody) ||
      this.hasListComprehensions(functionBody) ||
      this.hasLinearRecursion(functionBody)
    );
  }

  analyze(functionNode: Parser.SyntaxNode, parser: Parser): ComplexityNode {
    const functionBody = this.getFunctionBody(functionNode);
    const forLoops = this.findNodes(functionBody || functionNode, [
      "for_statement",
    ]);
    const whileLoops = this.findNodes(functionBody || functionNode, [
      "while_statement",
    ]);

    return {
      funcName: this.extractFunctionName(functionNode),
      hasParent: false,
      hasChild: false,
      parent: null,
      children: [],
      timeNotation: null,
      spaceNotation: this.notation,
      astNode: functionNode,
      forLoopCount: forLoops.length,
      whileLoopCount: whileLoops.length,
      isNested: false,
      recursiveCallCount: this.countRecursiveCalls(
        functionBody || functionNode
      ),
      keywords: ["linear_space", "data_structure_growth", "list_comprehension"],
      depth: 1,
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
   * Count recursive calls in function body
   */
  private countRecursiveCalls(functionBody: Parser.SyntaxNode): number {
    const calls = this.findNodes(functionBody, ["call"]);
    return calls.length; // Simplified count
  }

  /**
   * Check if function has data structures that grow linearly
   */
  private hasLinearDataStructureGrowth(
    functionBody: Parser.SyntaxNode
  ): boolean {
    const loops = this.findNodes(functionBody, [
      "for_statement",
      "while_statement",
    ]);

    for (const loop of loops) {
      // Check for append/add operations inside the loop
      const modifications = this.findDataStructureModifications(loop);
      if (modifications.length > 0) {
        // Check if it's a simple append in a single loop (O(n))
        const nestedLoops = this.findNodes(loop, [
          "for_statement",
          "while_statement",
        ]);
        if (nestedLoops.length <= 1) {
          // Only the current loop
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check for list comprehensions which typically use O(n) space
   */
  private hasListComprehensions(functionBody: Parser.SyntaxNode): boolean {
    const comprehensions = this.findNodes(functionBody, [
      "list_comprehension",
      "dictionary_comprehension",
      "set_comprehension",
    ]);
    return comprehensions.length > 0;
  }

  /**
   * Check for linear recursive patterns
   */
  private hasLinearRecursion(functionBody: Parser.SyntaxNode): boolean {
    const calls = this.findNodes(functionBody, ["call"]);

    // Look for recursive calls that might build up linear space
    for (const call of calls) {
      const text = call.text;
      // Simple heuristic: recursive calls with list operations
      if (/\w+\s*\(.*\+/.test(text) || /\w+\s*\(.*\[.*\]/.test(text)) {
        return true;
      }
    }

    return false;
  }
}
