import { analyzeCodeComplexity } from "./analysis/complexityAnalyzer";

const combinationSumCode = `def combination_sum(candidates, target):
    """Find all combinations that sum to target - O(2^n)"""
    result = []
    
    def backtrack(remaining, combination, start):
        if remaining == 0:
            result.append(combination[:])
            return
        
        for i in range(start, len(candidates)):
            if candidates[i] <= remaining:
                combination.append(candidates[i])
                backtrack(remaining - candidates[i], combination, i)
                combination.pop()
    
    backtrack(target, [], 0)
    return result`;

console.log("=== COMBINATION SUM DEBUG ===");
const result = analyzeCodeComplexity(combinationSumCode);
console.log("Result:", JSON.stringify(result, null, 2));
console.log(
  "Function text includes 'combination':",
  combinationSumCode.toLowerCase().includes("combination")
);
console.log(
  "Function text includes 'backtrack':",
  combinationSumCode.toLowerCase().includes("backtrack")
);
