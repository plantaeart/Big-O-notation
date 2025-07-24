import { SpaceComplexityResult } from "../models/SpaceComplexityResult.model";
import { ASTSpaceComplexityAnalyzer } from "../ast-manager/ASTSpaceComplexityAnalyzer";

// AST-based space complexity analyzer
const astAnalyzer = new ASTSpaceComplexityAnalyzer();

/**
 * Analyze space complexity using AST-manager architecture
 * @param codeOrLines - Python code as string or array of lines
 * @returns Space complexity analysis result
 */
export function analyzeSpaceComplexity(
  codeOrLines: string | string[]
): SpaceComplexityResult {
  try {
    // Convert to code string if lines array is provided
    const code = Array.isArray(codeOrLines)
      ? codeOrLines.join("\n")
      : codeOrLines;

    // Use AST-based analysis
    return astAnalyzer.analyzeCodeSpaceComplexity(code);
  } catch (error) {
    console.error("Error in space complexity analysis:", error);
    // Fallback to default O(1) space complexity
    return {
      notation: "O(1)",
      description: "Error in analysis - defaulting to constant space",
      confidence: 75,
      dataStructures: [],
    };
  }
}
