import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import { analyzeSpaceComplexity } from "../analysis/spaceAnalyzer";
import { getComplexityIndicator } from "../utils/complexityHelperUtils";

describe("EXCELLENT Complexity - O(1) Constant Time", () => {
  describe("Basic O(1) Operations", () => {
    test("should correctly identify O(1) time complexity", () => {
      const pythonCode = `def get_first_element(arr):
    if arr:
        return arr[0]  # Always takes same time
    return None`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("get_first_element");
      expect(result.methods[0].complexity.notation).toBe("O(1)");
      expect(result.methods[0].complexity.confidence).toBeGreaterThanOrEqual(
        70
      );
    });

    test("should correctly identify O(1) space complexity", () => {
      const pythonCode = `def get_first_element(arr):
    if arr:
        return arr[0]
    return None`;

      const lines = pythonCode.split("\n");
      const result = analyzeSpaceComplexity(lines);

      expect(result.notation).toBe("O(1)");
    });

    test("should rate O(1) complexity as EXCELLENT", () => {
      const rating = getComplexityIndicator("O(1)");
      expect(rating).toBe("EXCELLENT");
    });
  });

  describe("VSCode Extension O(1) Patterns", () => {
    test("should identify cache operations as O(1)", () => {
      const pythonCode = `def get_cached_result(cache, key):
    """Get result from cache - O(1)"""
    if key in cache:
        return cache[key]
    return None`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should identify setting toggles as O(1)", () => {
      const pythonCode = `def toggle_feature(settings, feature_name):
    """Toggle a feature setting - O(1)"""
    settings[feature_name] = not settings.get(feature_name, False)
    return settings[feature_name]`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should identify file extension extraction as O(1)", () => {
      const pythonCode = `def get_file_extension(filename):
    """Extract file extension - O(1)"""
    if '.' in filename:
        return filename.split('.')[-1]
    return ''`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should identify direct access operations as O(1)", () => {
      const pythonCode = `def get_config_value(config, key):
    """Get configuration value - O(1)"""
    return config.get(key, "default")`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should identify simple calculations as O(1)", () => {
      const pythonCode = `def calculate_score(base, multiplier):
    """Calculate score - O(1)"""
    return base * multiplier + 100`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });
  });

  describe("Mathematical O(1) Operations", () => {
    test("should identify mathematical formulas as O(1)", () => {
      const pythonCode = `def quadratic_formula(a, b, c):
    """Solve quadratic equation - O(1)"""
    discriminant = b*b - 4*a*c
    if discriminant < 0:
        return None
    return (-b + discriminant**0.5) / (2*a)`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should identify array index operations as O(1)", () => {
      const pythonCode = `def get_middle_element(arr):
    """Get middle element - O(1)"""
    if len(arr) == 0:
        return None
    return arr[len(arr) // 2]`;

      const result = analyzeCodeComplexity(pythonCode);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });
  });
});
