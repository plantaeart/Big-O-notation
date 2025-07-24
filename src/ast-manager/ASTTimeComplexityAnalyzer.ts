import { SyntaxNode } from "tree-sitter";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import {
  ComplexityNode,
  ComplexityPattern,
  ComplexityAnalysisContext,
} from "../models/ComplexityNode";
import { ComplexityAnalysisResult } from "../models/ComplexityAnalysisResult.model";
import { MethodAnalysis } from "../models/MethodAnalysis.model";
import { SpaceComplexityResult } from "../models/SpaceComplexityResult.model";
import { TimeComplexityPatternDetector } from "./time-complexity-detectors/TimeComplexityPatternDetector";
import { FactorialTimeComplexityDetector } from "./time-complexity-detectors/FactorialTimeComplexityDetector";
import { ExponentialTimeComplexityDetector } from "./time-complexity-detectors/ExponentialTimeComplexityDetector";
import { CubicTimeComplexityDetector } from "./time-complexity-detectors/CubicTimeComplexityDetector";
import { QuadraticTimeComplexityDetector } from "./time-complexity-detectors/QuadraticTimeComplexityDetector";
import { LinearithmicTimeComplexityDetector } from "./time-complexity-detectors/LinearithmicTimeComplexityDetector";
import { LinearTimeComplexityDetector } from "./time-complexity-detectors/LinearTimeComplexityDetector";
import { LogarithmicTimeComplexityDetector } from "./time-complexity-detectors/LogarithmicTimeComplexityDetector";
import { ConstantTimeComplexityDetector } from "./time-complexity-detectors/ConstantTimeComplexityDetector";

export class ASTTimeComplexityAnalyzer {
  private detectors: TimeComplexityPatternDetector[];
  private parser: Parser;

  constructor() {
    // Initialize parser
    this.parser = new Parser();
    try {
      this.parser.setLanguage(Python as any);
    } catch (error) {
      console.warn("Failed to set Python language for parser:", error);
    }

    // Initialize detectors in priority order (highest to lowest complexity)
    this.detectors = [
      new FactorialTimeComplexityDetector(), // O(n!)
      new LinearithmicTimeComplexityDetector(), // O(n log n) - check before exponential for divide-and-conquer
      new ExponentialTimeComplexityDetector(), // O(2^n)
      new CubicTimeComplexityDetector(), // O(n³)
      new QuadraticTimeComplexityDetector(), // O(n²)
      new LogarithmicTimeComplexityDetector(), // O(log n) - check before linear for binary search patterns
      new LinearTimeComplexityDetector(), // O(n)
      new ConstantTimeComplexityDetector(), // O(1)
    ];
  }

  /**
   * Analyze time complexity of Python code
   * @param code - Python source code as string
   * @returns ComplexityAnalysisResult with time complexity information
   */
  analyzeCodeTimeComplexity(code: string): ComplexityAnalysisResult {
    try {
      const tree = this.parser.parse(code);
      const rootNode = tree.rootNode;

      const methods: MethodAnalysis[] = [];
      this.findFunctions(rootNode, methods);

      // First pass: Analyze each function independently
      const functionComplexities = new Map<string, ComplexityPattern>();

      for (const method of methods) {
        if ((method as any).astNode) {
          const complexity = this.analyzeFunction(
            (method as any).astNode,
            method.name
          );

          if (complexity) {
            functionComplexities.set(method.name, complexity);
            method.complexity = {
              notation: complexity.notation,
              description: complexity.reasons.join(", "),
              confidence: complexity.confidence,
            };
          }
        }
      }

      // Second pass: Build call hierarchy and propagate complexities
      const callHierarchy = this.buildCallHierarchy(rootNode, methods);
      this.propagateComplexities(methods, functionComplexities, callHierarchy);

      return {
        methods,
        hierarchy: callHierarchy,
      };
    } catch (error) {
      console.error("Error in time complexity analysis:", error);
      return {
        methods: [],
        hierarchy: new Map<string, string[]>(),
      };
    }
  }

  /**
   * Find all function definitions in the AST
   */
  private findFunctions(node: SyntaxNode, methods: MethodAnalysis[]): void {
    if (node.type === "function_definition") {
      const nameNode = node.child(1);
      const functionName = nameNode ? nameNode.text : "unknown";

      const defaultSpaceComplexity: SpaceComplexityResult = {
        notation: "O(1)",
        description: "Default space complexity",
        confidence: 50,
        dataStructures: [],
      };

      const methodAnalysis: MethodAnalysis = {
        name: functionName,
        lineStart: node.startPosition.row + 1,
        lineEnd: node.endPosition.row + 1,
        complexity: {
          notation: "O(1)",
          description: "Not analyzed",
          confidence: 0,
        },
        spaceComplexity: defaultSpaceComplexity,
        explanation: "AST-manager time complexity analysis",
      };

      // Store AST node for analysis
      (methodAnalysis as any).astNode = node;
      methods.push(methodAnalysis);
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.findFunctions(child, methods);
      }
    }
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
      // Tree operations
      "tree",
      "root",
      "node",
      "left",
      "right",
      "parent",
      "child",
      "bst",
      "val",
      // Built-in functions
      "sum",
      "max",
      "min",
      "len",
      "count",
      "index",
      "range",
      "enumerate",
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

  /**
   * Builds call hierarchy by analyzing function calls within each function
   */
  private buildCallHierarchy(
    rootNode: SyntaxNode,
    methods: MethodAnalysis[]
  ): Map<string, string[]> {
    const callHierarchy = new Map<string, string[]>();
    const functionNames = new Set(methods.map((m) => m.name));

    for (const method of methods) {
      const calledFunctions: string[] = [];
      const astNode = (method as any).astNode;

      if (astNode) {
        this.traverseAST(astNode, (node) => {
          if (node.type === "call" && node.childCount > 0) {
            const functionCallNode = node.child(0);
            if (functionCallNode) {
              const calledFunctionName = functionCallNode.text;
              // Only track calls to functions that are defined in this code
              if (
                functionNames.has(calledFunctionName) &&
                calledFunctionName !== method.name
              ) {
                if (!calledFunctions.includes(calledFunctionName)) {
                  calledFunctions.push(calledFunctionName);
                }
              }
            }
          }
        });
      }

      callHierarchy.set(method.name, calledFunctions);
    }

    return callHierarchy;
  }

  /**
   * Propagates complexities from called functions to calling functions
   * Uses the highest complexity among all operations (own + called functions)
   */
  private propagateComplexities(
    methods: MethodAnalysis[],
    functionComplexities: Map<string, ComplexityPattern>,
    callHierarchy: Map<string, string[]>
  ): void {
    const complexityOrder = [
      "O(n!)",
      "O(2^n)",
      "O(n³)",
      "O(n²)",
      "O(n log n)",
      "O(n)",
      "O(log n)",
      "O(1)",
    ];

    // Helper function to get complexity priority (lower number = higher complexity)
    const getComplexityPriority = (notation: string): number => {
      const index = complexityOrder.indexOf(notation);
      return index === -1 ? complexityOrder.length : index;
    };

    // Helper function to get highest complexity from a list
    const getHighestComplexity = (complexities: string[]): string => {
      return complexities.reduce((highest, current) => {
        return getComplexityPriority(current) < getComplexityPriority(highest)
          ? current
          : highest;
      }, "O(1)");
    };

    // Process functions in dependency order (functions with no calls first)
    const processed = new Set<string>();
    const processing = new Set<string>();

    const processFunction = (functionName: string): string => {
      if (processed.has(functionName)) {
        const method = methods.find((m) => m.name === functionName);
        return method?.complexity.notation || "O(1)";
      }

      if (processing.has(functionName)) {
        // Circular dependency - return current complexity
        const method = methods.find((m) => m.name === functionName);
        return method?.complexity.notation || "O(1)";
      }

      processing.add(functionName);

      const calledFunctions = callHierarchy.get(functionName) || [];
      const method = methods.find((m) => m.name === functionName);

      if (!method) {
        processing.delete(functionName);
        processed.add(functionName);
        return "O(1)";
      }

      // Start with the function's own complexity
      const ownComplexity = method.complexity.notation;
      const allComplexities = [ownComplexity];

      // Add complexities of all called functions
      for (const calledFunction of calledFunctions) {
        const calledComplexity = processFunction(calledFunction);
        allComplexities.push(calledComplexity);
      }

      // Determine the highest complexity
      const finalComplexity = getHighestComplexity(allComplexities);

      // Update the method's complexity if it changed
      if (finalComplexity !== ownComplexity) {
        const reasons = [
          method.complexity.description,
          `Calls functions with complexities: ${calledFunctions
            .map((f) => {
              const calledMethod = methods.find((m) => m.name === f);
              return `${f}(${calledMethod?.complexity.notation || "O(1)"})`;
            })
            .join(", ")}`,
        ].filter((r) => r && r.length > 0);

        method.complexity = {
          notation: finalComplexity,
          description: reasons.join("; "),
          confidence: Math.min(method.complexity.confidence, 85, 100), // Cap at 100% and slightly lower for propagated
        };

        console.log(
          `Updated ${functionName}: ${ownComplexity} -> ${finalComplexity} (calls: ${calledFunctions.join(
            ", "
          )})`
        );
      }

      processing.delete(functionName);
      processed.add(functionName);
      return finalComplexity;
    };

    // Process all functions
    for (const method of methods) {
      processFunction(method.name);
    }
  }
}
