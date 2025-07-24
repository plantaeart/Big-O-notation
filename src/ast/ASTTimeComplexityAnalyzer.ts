import { PythonASTParser } from "./parsers/PythonASTParser";
import { TimeComplexityVisitor } from "./visitors/TimeComplexityVisitor";
import { ASTSpaceComplexityAnalyzer } from "./ASTSpaceComplexityAnalyzer";
import { FunctionNode } from "./models/ASTNode";
import { ComplexityAnalysisResult } from "../models/ComplexityAnalysisResult.model";
import { MethodAnalysis } from "../models/MethodAnalysis.model";

/**
 * Pure AST-based complexity analyzer for Python code
 */
export class ASTTimeComplexityAnalyzer {
  private parser: PythonASTParser;
  private timeVisitor: TimeComplexityVisitor;
  private spaceAnalyzer: ASTSpaceComplexityAnalyzer;

  constructor() {
    this.parser = new PythonASTParser();
    this.timeVisitor = new TimeComplexityVisitor();
    this.spaceAnalyzer = new ASTSpaceComplexityAnalyzer();
  }

  /**
   * Analyze complexity of Python code using AST
   */
  analyzeCodeComplexity(code: string): ComplexityAnalysisResult {
    try {
      // Parse code into AST
      const ast = this.parser.parse(code);

      // Extract function nodes
      const functionNodes = this.parser.getFunctionNodes(ast);

      // Clear hierarchy tracking for new analysis
      this.timeVisitor.clearHierarchy();

      // Analyze each function and track hierarchy
      const methods: MethodAnalysis[] = functionNodes.map((functionNode) => {
        // Set current function for hierarchy tracking
        this.timeVisitor.setCurrentFunction(functionNode.functionName);
        return this.analyzeFunctionNode(functionNode, code);
      });

      // Get hierarchy from visitor
      const hierarchy = this.timeVisitor.getFunctionHierarchy();

      return {
        methods,
        hierarchy,
      };
    } catch (error) {
      console.error("AST parsing error:", error);

      // Fallback to basic analysis if parsing fails
      return {
        methods: [
          {
            name: "unknown_function",
            complexity: {
              notation: "O(1)",
              confidence: 50,
              description: "Unable to parse function structure",
            },
            spaceComplexity: {
              notation: "O(1)",
              confidence: 50,
              description: "Unable to analyze space complexity",
              dataStructures: [],
            },
            lineStart: 1,
            lineEnd: code.split("\n").length,
            explanation: "Parsing failed, using fallback analysis",
          },
        ],
        hierarchy: new Map<string, string[]>(),
      };
    }
  }

  /**
   * Analyze a single function node using pure AST analysis
   */
  private analyzeFunctionNode(
    functionNode: FunctionNode,
    fullCode: string
  ): MethodAnalysis {
    // Analyze time complexity using AST visitor
    const timeComplexity =
      this.timeVisitor.analyzeFunctionComplexity(functionNode);

    // Analyze space complexity using AST analyzer - extract just the function code
    const functionCode = this.extractFunctionCode(functionNode, fullCode);
    const spaceComplexity =
      this.spaceAnalyzer.analyzeCodeSpaceComplexity(functionCode);

    return {
      name: functionNode.functionName,
      complexity: timeComplexity,
      spaceComplexity: spaceComplexity,
      lineStart: functionNode.startLine,
      lineEnd: functionNode.endLine,
      explanation: `Function analyzed using pure AST parsing with ${timeComplexity.notation} time complexity`,
    };
  }

  /**
   * Extract the complete function code including definition
   */
  private extractFunctionCode(
    functionNode: FunctionNode,
    fullCode: string
  ): string {
    const allLines = fullCode.split("\n");
    const startIndex = functionNode.startLine - 1; // Convert to 0-based index
    const endIndex = functionNode.endLine - 1;

    return allLines.slice(startIndex, endIndex + 1).join("\n");
  }
}
