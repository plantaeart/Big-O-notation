import { SyntaxNode } from "tree-sitter";
import {
  ComplexityNode,
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../../models/ComplexityNode";

export abstract class ComplexityPatternDetector {
  protected abstract readonly complexityNotation: string;
  protected abstract readonly minConfidence: number;

  /**
   * Analyzes AST node to build complexity metadata
   */
  protected buildComplexityNode(
    astNode: SyntaxNode,
    funcName: string,
    parent: ComplexityNode | null = null
  ): ComplexityNode {
    const node: ComplexityNode = {
      funcName,
      hasParent: parent !== null,
      hasChild: false,
      parent,
      children: [],
      timeNotation: null,
      spaceNotation: null,
      astNode,
      forLoopCount: 0,
      whileLoopCount: 0,
      isNested: false,
      recursiveCallCount: 0,
      keywords: [],
      depth: parent ? parent.depth + 1 : 0,
      confidence: 0,
    };

    // Build analysis metadata through AST traversal
    this.analyzeASTStructure(node);
    this.detectKeywords(node);
    this.analyzeNesting(node);
    this.countRecursiveCalls(node);

    return node;
  }

  /**
   * Analyzes AST structure to count loops and identify patterns
   */
  private analyzeASTStructure(node: ComplexityNode): void {
    this.traverseAST(node.astNode, (child) => {
      switch (child.type) {
        case "for_statement":
          node.forLoopCount++;
          break;
        case "while_statement":
          node.whileLoopCount++;
          break;
      }
    });
  }

  /**
   * Detects important keywords through AST identifier analysis
   */
  private detectKeywords(node: ComplexityNode): void {
    this.traverseAST(node.astNode, (child) => {
      if (child.type === "identifier") {
        const text = child.text;
        if (this.isImportantKeyword(text)) {
          node.keywords.push(text);
        }
      }
    });
  }

  /**
   * Analyzes nesting patterns through AST structure
   */
  private analyzeNesting(node: ComplexityNode): void {
    let maxDepth = 0;

    const analyzeDepth = (astNode: SyntaxNode, currentDepth: number): void => {
      if (
        astNode.type === "for_statement" ||
        astNode.type === "while_statement"
      ) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }

      for (let i = 0; i < astNode.childCount; i++) {
        const child = astNode.child(i);
        if (child) {
          analyzeDepth(child, currentDepth);
        }
      }
    };

    analyzeDepth(node.astNode, 0);
    node.isNested = maxDepth > 1;
  }

  /**
   * Counts recursive calls through AST call expression analysis
   */
  private countRecursiveCalls(node: ComplexityNode): void {
    this.traverseAST(node.astNode, (child) => {
      if (child.type === "call" && child.childCount > 0) {
        const functionName = child.child(0);
        if (functionName && functionName.text === node.funcName) {
          node.recursiveCallCount++;
        }
      }
    });
  }

  /**
   * Helper method to traverse AST nodes
   */
  protected traverseAST(
    node: SyntaxNode,
    callback: (node: SyntaxNode) => void
  ): void {
    callback(node);

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.traverseAST(child, callback);
      }
    }
  }

  /**
   * Checks if a keyword is important for complexity analysis
   */
  protected isImportantKeyword(keyword: string): boolean {
    const importantKeywords = [
      "sorted",
      "sort",
      "append",
      "pop",
      "push",
      "heappush",
      "heappop",
      "permutations",
      "combinations",
      "range",
      "len",
      "bisect",
    ];
    return importantKeywords.includes(keyword);
  }

  /**
   * Main detection method - must be implemented by each detector
   */
  abstract detect(context: ComplexityAnalysisContext): ComplexityPattern | null;

  /**
   * Helper to create complexity pattern result
   */
  protected createPattern(
    confidence: number,
    patterns: string[],
    reasons: string[]
  ): ComplexityPattern {
    return {
      notation: this.complexityNotation,
      confidence,
      patterns,
      reasons,
    };
  }
}
