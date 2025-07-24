import { SyntaxNode } from "tree-sitter";
import {
  ComplexityNode,
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../models/ComplexityNode";
import { TimeComplexityPatternDetector } from "./time-complexity-detectors/TimeComplexityPatternDetector";
import { FactorialTimeComplexityDetector } from "./time-complexity-detectors/FactorialTimeComplexityDetector";
import { ExponentialTimeComplexityDetector } from "./time-complexity-detectors/ExponentialTimeComplexityDetector";
import { QuadraticTimeComplexityDetector } from "./time-complexity-detectors/QuadraticTimeComplexityDetector";
import { LinearithmicTimeComplexityDetector } from "./time-complexity-detectors/LinearithmicTimeComplexityDetector";
import { LinearTimeComplexityDetector } from "./time-complexity-detectors/LinearTimeComplexityDetector";
import { LogarithmicTimeComplexityDetector } from "./time-complexity-detectors/LogarithmicTimeComplexityDetector";
import { ConstantTimeComplexityDetector } from "./time-complexity-detectors/ConstantTimeComplexityDetector";

export class ASTComplexityAnalyzer {
  private detectors: TimeComplexityPatternDetector[];

  constructor() {
    // Initialize detectors in priority order (highest to lowest complexity)
    this.detectors = [
      new FactorialTimeComplexityDetector(), // O(n!)
      new ExponentialTimeComplexityDetector(), // O(2^n)
      new QuadraticTimeComplexityDetector(), // O(n²) - Adding Cubic would go here
      new LinearithmicTimeComplexityDetector(), // O(n log n)
      new LinearTimeComplexityDetector(), // O(n)
      new LogarithmicTimeComplexityDetector(), // O(log n)
      new ConstantTimeComplexityDetector(), // O(1)
    ];
  }

  /**
   * Analyzes a function's AST node to determine its time complexity
   * @param astNode - The AST node representing the function
   * @param funcName - Name of the function
   * @param parent - Parent complexity node (for nested functions)
   * @returns ComplexityPattern or null if no pattern detected
   */
  analyzeFunction(
    astNode: SyntaxNode,
    funcName: string,
    parent: ComplexityNode | null = null
  ): ComplexityPattern | null {
    // Build complexity node with unified structure
    const complexityNode = this.buildComplexityNode(astNode, funcName, parent);

    // Create analysis context
    const context: ComplexityAnalysisContext = {
      node: complexityNode,
      ancestorComplexities: this.getAncestorComplexities(parent),
      siblingComplexities: this.getSiblingComplexities(parent),
      globalKeywords: this.extractGlobalKeywords(astNode),
    };

    // Try each detector in priority order (highest complexity first)
    for (const detector of this.detectors) {
      const pattern = detector.detect(context);
      if (pattern) {
        // Set the detected complexity
        complexityNode.timeNotation = pattern.notation;
        complexityNode.confidence = pattern.confidence;

        return pattern;
      }
    }

    // Default to O(1) if no pattern detected
    const defaultPattern: ComplexityPattern = {
      notation: "O(1)",
      confidence: 30,
      patterns: ["default"],
      reasons: ["No complexity patterns detected, defaulting to constant time"],
    };

    complexityNode.timeNotation = defaultPattern.notation;
    complexityNode.confidence = defaultPattern.confidence;

    return defaultPattern;
  }

  /**
   * Builds a ComplexityNode from AST with unified structure
   */
  private buildComplexityNode(
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

    // Update parent-child relationships
    if (parent) {
      parent.hasChild = true;
      parent.children.push(node);
    }

    // Analyze AST structure using pure AST traversal
    this.analyzeASTStructure(node);
    this.detectKeywords(node);
    this.analyzeNesting(node);
    this.countRecursiveCalls(node);
    this.findChildFunctions(node);

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
   * Detects important keywords through AST identifier analysis (no regex)
   */
  private detectKeywords(node: ComplexityNode): void {
    this.traverseAST(node.astNode, (child) => {
      if (child.type === "identifier") {
        const text = child.text;
        if (this.isImportantKeyword(text)) {
          node.keywords.push(text);
        }
      }

      // Also check string literals for algorithm names
      if (child.type === "string") {
        const text = child.text.toLowerCase();
        const algorithmKeywords = [
          "fibonacci",
          "merge",
          "quick",
          "heap",
          "binary",
          "sort",
          "search",
          "factorial",
          "exponential",
          "linear",
          "constant",
        ];

        algorithmKeywords.forEach((keyword) => {
          if (text.includes(keyword)) {
            node.keywords.push(keyword);
          }
        });
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
   * Finds child functions within the current function
   */
  private findChildFunctions(node: ComplexityNode): void {
    this.traverseAST(node.astNode, (child) => {
      if (child.type === "function_definition" && child !== node.astNode) {
        // Found a nested function - analyze it recursively
        const funcNameNode = child.child(1); // function name is usually second child
        if (funcNameNode) {
          const childComplexityNode = this.buildComplexityNode(
            child,
            funcNameNode.text,
            node
          );

          // The buildComplexityNode already handles parent-child relationships
        }
      }
    });
  }

  /**
   * Helper method to traverse AST nodes
   */
  private traverseAST(
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
  private isImportantKeyword(keyword: string): boolean {
    const importantKeywords = [
      // Sorting and searching
      "sorted",
      "sort",
      "search",
      "find",
      "binary",
      "bisect",
      // Data structure operations
      "append",
      "pop",
      "push",
      "insert",
      "remove",
      "extend",
      // Heap operations
      "heap",
      "heappush",
      "heappop",
      "heapify",
      // Built-in functions
      "sum",
      "max",
      "min",
      "len",
      "count",
      "index",
      "range",
      // Algorithm keywords
      "merge",
      "partition",
      "divide",
      "conquer",
      "recursive",
      // Complexity indicators
      "fibonacci",
      "factorial",
      "exponential",
      "linear",
      "constant",
      "quadratic",
      "logarithmic",
      "permutation",
      "combination",
    ];

    return importantKeywords.includes(keyword.toLowerCase());
  }

  /**
   * Gets complexity notations of ancestor nodes
   */
  private getAncestorComplexities(parent: ComplexityNode | null): string[] {
    const complexities: string[] = [];
    let current = parent;

    while (current) {
      if (current.timeNotation) {
        complexities.push(current.timeNotation);
      }
      current = current.parent;
    }

    return complexities;
  }

  /**
   * Gets complexity notations of sibling nodes
   */
  private getSiblingComplexities(parent: ComplexityNode | null): string[] {
    if (!parent) {
      return [];
    }

    return parent.children
      .filter((child) => child.timeNotation)
      .map((child) => child.timeNotation!);
  }

  /**
   * Extracts global keywords from the entire AST
   */
  private extractGlobalKeywords(astNode: SyntaxNode): Set<string> {
    const keywords = new Set<string>();

    this.traverseAST(astNode, (child) => {
      if (child.type === "identifier" && this.isImportantKeyword(child.text)) {
        keywords.add(child.text);
      }
    });

    return keywords;
  }
}
