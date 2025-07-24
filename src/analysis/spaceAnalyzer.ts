import { SpaceComplexityResult } from "../models/SpaceComplexityResult.model";
import { ASTSpaceComplexityAnalyzer } from "../ast/ASTSpaceComplexityAnalyzer";

// Pure AST-based space complexity analyzer
const astAnalyzer = new ASTSpaceComplexityAnalyzer();

/**
 * Analyze space complexity using pure AST analysis
 * @param codeOrLines - Python code as string or array of lines
 * @returns Space complexity analysis result
 */
export function analyzeSpaceComplexity(
  codeOrLines: string | string[]
): SpaceComplexityResult {
  // Convert to code string if lines array is provided
  const code = Array.isArray(codeOrLines)
    ? codeOrLines.join("\n")
    : codeOrLines;

  // Use pure AST-based analysis
  return astAnalyzer.analyzeCodeSpaceComplexity(code);
}
