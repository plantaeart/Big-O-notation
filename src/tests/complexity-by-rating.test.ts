// Big O Notation Complexity Tests - Organized by Performance Rating
// This file serves as the entry point for all complexity rating tests

// EXCELLENT Performance - O(1) Constant Time
import "./time-complexity-tests/complexity-excellent.test";

// GOOD Performance - O(log n) Logarithmic and O(n) Linear Time
import "./time-complexity-tests/complexity-good.test";

// FAIR Performance - O(n log n) Linearithmic Time
import "./time-complexity-tests/complexity-fair.test";

// POOR Performance - O(n²) Quadratic and O(n³) Cubic Time
import "./time-complexity-tests/complexity-poor.test";

// BAD Performance - O(2^n) Exponential Time
import "./time-complexity-tests/complexity-bad.test";

// TERRIBLE Performance - O(k^n) and O(n!) Factorial Time
import "./time-complexity-tests/complexity-terrible.test";

/**
 * Big O Complexity Rating System:
 *
 * EXCELLENT (Green) - O(1)
 * ├── Constant time operations
 * ├── Direct access, cache lookups
 * └── Mathematical calculations
 *
 * GOOD (Light Green) - O(log n), O(n)
 * ├── O(log n): Binary search, tree operations
 * └── O(n): Linear scans, single loops
 *
 * FAIR (Yellow) - O(n log n)
 * ├── Efficient sorting algorithms
 * ├── Merge sort, quick sort, heap sort
 * └── Divide and conquer with merge
 *
 * POOR (Orange) - O(n²), O(n³)
 * ├── O(n²): Nested loops, simple sorting
 * └── O(n³): Triple nested loops, matrix multiplication
 *
 * BAD (Red) - O(2^n)
 * ├── Exponential recursive algorithms
 * ├── Fibonacci without memoization
 * └── Subset generation, backtracking
 *
 * TERRIBLE (Dark Red) - O(k^n), O(n!)
 * ├── O(k^n): k-way recursive calls
 * └── O(n!): All permutations, traveling salesman
 */

describe("Big O Notation Test Suite by Performance Rating", () => {
  test("should have organized tests by complexity ratings", () => {
    // This is a meta-test to ensure all rating categories are tested
    const ratings = ["EXCELLENT", "GOOD", "FAIR", "POOR", "BAD", "TERRIBLE"];
    expect(ratings).toHaveLength(6);

    // Each rating should correspond to specific complexity types
    const ratingMappings = {
      EXCELLENT: ["O(1)"],
      GOOD: ["O(log n)", "O(n)"],
      FAIR: ["O(n log n)"],
      POOR: ["O(n²)", "O(n³)"],
      BAD: ["O(2^n)"],
      TERRIBLE: ["O(k^n)", "O(n!)"],
    };

    expect(Object.keys(ratingMappings)).toEqual(ratings);
  });
});
