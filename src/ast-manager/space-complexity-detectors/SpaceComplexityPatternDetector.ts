import Parser from "tree-sitter";
import { ComplexityNode } from "../../models/ComplexityNode";

/**
 * Base class for all space complexity pattern detectors
 * Provides common functionality for analyzing space complexity patterns
 */
export abstract class SpaceComplexityPatternDetector {
  /**
   * The space complexity notation this detector identifies (e.g., "O(1)", "O(n)")
   */
  abstract readonly notation: string;

  /**
   * Confidence level for this detector's analysis (0-100)
   */
  abstract readonly confidence: number;

  /**
   * Priority for this detector (higher = checked first)
   * Used to ensure more specific patterns are detected before general ones
   */
  abstract readonly priority: number;

  /**
   * Detect if the given function node matches this space complexity pattern
   * @param functionNode - The AST node representing the function
   * @param parser - Tree-sitter parser instance
   * @returns true if pattern matches, false otherwise
   */
  abstract detect(functionNode: Parser.SyntaxNode, parser: Parser): boolean;

  /**
   * Get detailed analysis information about the detected pattern
   * @param functionNode - The AST node representing the function
   * @param parser - Tree-sitter parser instance
   * @returns ComplexityNode with analysis details
   */
  abstract analyze(
    functionNode: Parser.SyntaxNode,
    parser: Parser
  ): ComplexityNode;

  /**
   * Helper method to get function body node
   * @param functionNode - The function definition node
   * @returns The function body node or null if not found
   */
  protected getFunctionBody(
    functionNode: Parser.SyntaxNode
  ): Parser.SyntaxNode | null {
    // Look for function body (block or suite in Python)
    for (let i = 0; i < functionNode.childCount; i++) {
      const child = functionNode.child(i);
      if (child && (child.type === "block" || child.type === "suite")) {
        return child;
      }
    }
    return null;
  }

  /**
   * Helper method to find all nodes of specific types within a node
   * @param node - Root node to search from
   * @param nodeTypes - Array of node types to find
   * @returns Array of matching nodes
   */
  protected findNodes(
    node: Parser.SyntaxNode,
    nodeTypes: string[]
  ): Parser.SyntaxNode[] {
    const nodes: Parser.SyntaxNode[] = [];

    const traverse = (current: Parser.SyntaxNode) => {
      if (nodeTypes.includes(current.type)) {
        nodes.push(current);
      }

      for (let i = 0; i < current.childCount; i++) {
        const child = current.child(i);
        if (child) {
          traverse(child);
        }
      }
    };

    traverse(node);
    return nodes;
  }

  /**
   * Helper method to check if a node contains specific text patterns
   * @param node - Node to check
   * @param patterns - Array of regex patterns to match
   * @returns true if any pattern matches
   */
  protected hasTextPattern(
    node: Parser.SyntaxNode,
    patterns: RegExp[]
  ): boolean {
    const text = node.text;
    return patterns.some((pattern) => pattern.test(text));
  }

  /**
   * Helper method to find variable assignments that create data structures
   * @param functionBody - Function body node to analyze
   * @returns Array of assignment nodes that create data structures
   */
  protected findDataStructureCreations(
    functionBody: Parser.SyntaxNode
  ): Parser.SyntaxNode[] {
    const assignments = this.findNodes(functionBody, ["assignment"]);
    return assignments.filter((assignment) => {
      const text = assignment.text;
      // Check for common data structure creation patterns
      return (
        /=\s*\[/.test(text) || // list creation: = []
        /=\s*\{/.test(text) || // dict creation: = {}
        /=\s*set\s*\(/.test(text) || // set creation: = set()
        /=\s*list\s*\(/.test(text) || // list creation: = list()
        /=\s*dict\s*\(/.test(text)
      ); // dict creation: = dict()
    });
  }

  /**
   * Helper method to find append/add operations on data structures
   * @param functionBody - Function body node to analyze
   * @returns Array of method call nodes that modify data structures
   */
  protected findDataStructureModifications(
    functionBody: Parser.SyntaxNode
  ): Parser.SyntaxNode[] {
    const calls = this.findNodes(functionBody, ["call"]);
    return calls.filter((call) => {
      const text = call.text;
      return (
        /\.append\s*\(/.test(text) || // list.append()
        /\.add\s*\(/.test(text) || // set.add()
        /\.insert\s*\(/.test(text) || // list.insert()
        /\.extend\s*\(/.test(text)
      ); // list.extend()
    });
  }
}
