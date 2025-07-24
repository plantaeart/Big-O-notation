import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import { ComplexityNode } from "../models/ComplexityNode";
import { SpaceComplexityPatternDetector } from "./space-complexity-detectors/SpaceComplexityPatternDetector";
import { ConstantSpaceComplexityDetector } from "./space-complexity-detectors/ConstantSpaceComplexityDetector";
import { LinearSpaceComplexityDetector } from "./space-complexity-detectors/LinearSpaceComplexityDetector";

/**
 * AST-based Space Complexity Analyzer
 * Uses Tree-sitter to parse Python code and detect space complexity patterns
 */
export class ASTSpaceComplexityAnalyzer {
  private parser: Parser;
  private detectors: SpaceComplexityPatternDetector[];

  constructor() {
    this.parser = new Parser();
    try {
      this.parser.setLanguage(Python as any);
    } catch (error) {
      console.warn("Failed to set Python language for parser:", error);
    }

    // Initialize detectors in priority order (highest to lowest)
    this.detectors = [
      new LinearSpaceComplexityDetector(), // O(n) - Check before O(1)
      new ConstantSpaceComplexityDetector(), // O(1) - Default fallback
    ];

    // Sort by priority (highest first)
    this.detectors.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze space complexity of Python code
   * @param code - Python source code as string
   * @returns Analysis result with space complexity information
   */
  analyzeCodeSpaceComplexity(code: string): {
    notation: string;
    confidence: number;
    description: string;
    dataStructures: string[];
  } {
    try {
      const tree = this.parser.parse(code);
      const rootNode = tree.rootNode;

      // Check for parse errors or invalid syntax
      if (this.hasParseErrors(rootNode) || code.trim() === "") {
        return {
          notation: "O(1)",
          confidence: 50,
          description: "Error in analysis - defaulting to constant space",
          dataStructures: [],
        };
      }

      // Find all function definitions
      const functions = this.findFunctionNodes(rootNode);

      if (functions.length === 0) {
        // No functions found, analyze as script-level code
        return this.analyzeScriptLevel(rootNode);
      }

      // Analyze the first function (primary analysis target)
      const primaryFunction = functions[0];
      const complexityNode = this.analyzeFunction(primaryFunction);

      return {
        notation: complexityNode.spaceNotation || "O(1)",
        confidence: complexityNode.confidence,
        description: this.getDescription(
          complexityNode.spaceNotation || "O(1)"
        ),
        dataStructures: this.extractDataStructures(complexityNode),
      };
    } catch (error) {
      console.error("Error analyzing space complexity:", error);
      return {
        notation: "O(1)",
        confidence: 50,
        description: "Error in analysis - defaulting to constant space",
        dataStructures: [],
      };
    }
  }

  /**
   * Analyze a single function for space complexity
   */
  private analyzeFunction(functionNode: Parser.SyntaxNode): ComplexityNode {
    // Try each detector in priority order
    for (const detector of this.detectors) {
      if (detector.detect(functionNode, this.parser)) {
        return detector.analyze(functionNode, this.parser);
      }
    }

    // Fallback to O(1) if no pattern matches
    const constantDetector = new ConstantSpaceComplexityDetector();
    return constantDetector.analyze(functionNode, this.parser);
  }

  /**
   * Analyze script-level code (no function definitions)
   */
  private analyzeScriptLevel(rootNode: Parser.SyntaxNode): {
    notation: string;
    confidence: number;
    description: string;
    dataStructures: string[];
  } {
    // For script-level analysis, check for data structure operations
    const hasDataStructures = this.hasDataStructureOperations(rootNode);

    if (hasDataStructures) {
      return {
        notation: "O(n)",
        confidence: 70,
        description: "Script contains data structure operations",
        dataStructures: ["lists", "dictionaries"],
      };
    }

    return {
      notation: "O(1)",
      confidence: 80,
      description: "Script uses constant space",
      dataStructures: [],
    };
  }

  /**
   * Check if the AST contains parse errors
   */
  private hasParseErrors(node: Parser.SyntaxNode): boolean {
    if (node.hasError) {
      return true;
    }

    // Also check for ERROR nodes specifically
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && (child.type === "ERROR" || this.hasParseErrors(child))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find all function definition nodes in the AST
   */
  private findFunctionNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const functions: Parser.SyntaxNode[] = [];

    const traverse = (current: Parser.SyntaxNode) => {
      if (current.type === "function_definition") {
        functions.push(current);
      }

      for (let i = 0; i < current.childCount; i++) {
        const child = current.child(i);
        if (child) {
          traverse(child);
        }
      }
    };

    traverse(node);
    return functions;
  }

  /**
   * Check if node contains data structure operations
   */
  private hasDataStructureOperations(node: Parser.SyntaxNode): boolean {
    const text = node.text;
    return (
      /\[.*\]/.test(text) || // List operations
      /\{.*\}/.test(text) || // Dict operations
      /\.append\s*\(/.test(text) || // List append
      /\.add\s*\(/.test(text)
    ); // Set add
  }

  /**
   * Get human-readable description for complexity notation
   */
  private getDescription(notation: string): string {
    const descriptions = {
      "O(1)": "Uses constant space regardless of input size",
      "O(n)": "Space usage grows linearly with input size",
      "O(n²)": "Space usage grows quadratically with input size",
      "O(log n)": "Space usage grows logarithmically with input size",
    };

    return (
      descriptions[notation as keyof typeof descriptions] ||
      "Space complexity analysis"
    );
  }

  /**
   * Extract data structures mentioned in the complexity analysis
   */
  private extractDataStructures(complexityNode: ComplexityNode): string[] {
    const dataStructures: string[] = [];

    // Extract from keywords
    if (complexityNode.keywords.includes("list_comprehension")) {
      dataStructures.push("lists");
    }
    if (complexityNode.keywords.includes("data_structure_growth")) {
      dataStructures.push("dynamic_structures");
    }

    return dataStructures;
  }
}
