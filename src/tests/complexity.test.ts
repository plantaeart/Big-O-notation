import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import { analyzeSpaceComplexity } from "../analysis/spaceAnalyzer";
import { getComplexityIndicator } from "../utils/complexityHelperUtils";

describe("Big O Complexity Analysis", () => {
  describe("O(1) Constant Time Analysis", () => {
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
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should rate O(1) complexity as EXCELLENT", () => {
      const rating = getComplexityIndicator("O(1)");
      expect(rating).toBe("EXCELLENT");
    });
  });

  describe("O(n) Linear Time Analysis", () => {
    test("should identify simple loop as O(n)", () => {
      const pythonCode = `def print_all(arr):
    for item in arr:
        print(item)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });

    test("should identify list comprehension as O(n)", () => {
      const pythonCode = `def double_all(arr):
    return [x * 2 for x in arr]`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });
  });

  describe("O(n²) Quadratic Time Analysis", () => {
    test("should identify nested loops as O(n²)", () => {
      const pythonCode = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(n²)");
    });

    test("should identify matrix operations as O(n²)", () => {
      const pythonCode = `def print_matrix(matrix):
    for row in matrix:
        for col in row:
            print(col)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(n²)");
    });
  });

  describe("Async Function Detection", () => {
    test("should detect both async and sync functions", () => {
      const pythonCode = `async def fetch_data():
    return await api.get_data()  # O(1) operation

def process_data(data):
    for item in data:  # O(n) loop
        print(item)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(2);

      const asyncMethod = result.methods.find((m) => m.name === "fetch_data");
      const syncMethod = result.methods.find((m) => m.name === "process_data");

      expect(asyncMethod).toBeDefined();
      expect(syncMethod).toBeDefined();
      expect(asyncMethod!.complexity.notation).toBe("O(1)");
      expect(syncMethod!.complexity.notation).toBe("O(n)");
    });

    test("should handle async function with loops", () => {
      const pythonCode = `async def async_process_all(items):
    for item in items:
        await process_item(item)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe("async_process_all");
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });
  });

  describe("Complex Patterns", () => {
    test("should analyze multiple functions with different complexities", () => {
      const pythonCode = `def constant_operation():
    return 42

def linear_search(arr, target):
    for item in arr:
        if item == target:
            return True
    return False

def nested_loop_operation(n):
    for i in range(n):
        for j in range(n):
            print(i, j)`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(3);

      const constant = result.methods.find(
        (m) => m.name === "constant_operation"
      );
      const linear = result.methods.find((m) => m.name === "linear_search");
      const quadratic = result.methods.find(
        (m) => m.name === "nested_loop_operation"
      );

      expect(constant?.complexity.notation).toBe("O(1)");
      expect(linear?.complexity.notation).toBe("O(n)");
      expect(quadratic?.complexity.notation).toBe("O(n²)");
    });

    test("should handle functions with early returns", () => {
      const pythonCode = `def find_first_match(arr, target):
    for item in arr:
        if item == target:
            return item  # Early return
    return None`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(n)");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty functions", () => {
      const pythonCode = `def empty_function():
    pass`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should handle functions with only comments", () => {
      const pythonCode = `def commented_function():
    # This is just a comment
    # Another comment
    return None`;

      const result = analyzeCodeComplexity(pythonCode);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].complexity.notation).toBe("O(1)");
    });

    test("should handle malformed code gracefully", () => {
      const pythonCode = `def incomplete_function(
    # Missing closing parenthesis and body`;

      // Should not throw an error
      expect(() => analyzeCodeComplexity(pythonCode)).not.toThrow();
    });
  });

  describe("Space Complexity Analysis", () => {
    test("should identify O(1) space complexity", () => {
      const lines = ["def constant_space():", "    x = 5", "    return x * 2"];

      const result = analyzeSpaceComplexity(lines);

      expect(result.notation).toBe("O(1)");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    test("should identify O(n) space complexity for list creation", () => {
      const lines = [
        "def create_list(n):",
        "    result = []",
        "    for i in range(n):",
        "        result.append(i)",
        "    return result",
      ];

      const result = analyzeSpaceComplexity(lines);

      expect(result.notation).toBe("O(n)");
    });
  });

  describe("VSCode Extension Development Patterns", () => {
    describe("O(1) Constant Time Operations", () => {
      test("should identify cache operations as O(1)", () => {
        const pythonCode = `def get_cached_result(cache, key):
    """Get result from cache - O(1)"""
    return cache.get(key, None)`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(1)");
      });

      test("should identify setting toggles as O(1)", () => {
        const pythonCode = `def toggle_setting(settings, setting_name):
    """Toggle a boolean setting - O(1)"""
    settings[setting_name] = not settings.get(setting_name, False)
    return settings[setting_name]`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(1)");
      });

      test("should identify file extension extraction as O(1)", () => {
        const pythonCode = `def get_file_extension(filename):
    """Extract file extension - O(1)"""
    return filename.split('.')[-1] if '.' in filename else ""`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(1)");
      });
    });

    describe("O(log n) Logarithmic Time Operations", () => {
      test("should identify binary search as O(log n)", () => {
        const pythonCode = `def binary_search_completions(completions, prefix):
    """Binary search for code completions - O(log n)"""
    left, right = 0, len(completions) - 1
    result = []
    
    while left <= right:
        mid = (left + right) // 2
        if completions[mid].startswith(prefix):
            return completions[mid]
        elif completions[mid] < prefix:
            left = mid + 1
        else:
            right = mid - 1
    
    return result`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(log n)");
      });

      test("should identify bracket matching as O(log n)", () => {
        const pythonCode = `def find_matching_bracket(text, start_pos):
    """Find matching bracket - O(log n) average"""
    if start_pos >= len(text):
        return -1
    
    count = 0
    for i in range(start_pos, len(text)):
        if text[i] == '(':
            count += 1
        elif text[i] == ')':
            count -= 1
            if count == 0:
                return i
    return -1`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n)");
      });
    });

    describe("O(n) Linear Time Operations", () => {
      test("should identify line counting as O(n)", () => {
        const pythonCode = `def count_lines_of_code(file_content):
    """Count non-empty, non-comment lines - O(n)"""
    lines = file_content.split('\\n')
    count = 0
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('#'):
            count += 1
    return count`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n)");
      });

      test("should identify function definition finding as O(n)", () => {
        const pythonCode = `def find_all_function_definitions(code):
    """Find all function definitions - O(n)"""
    lines = code.split('\\n')
    functions = []
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('def ') and '(' in stripped:
            func_name = stripped.split('(')[0].replace('def ', '').strip()
            functions.append({'name': func_name, 'line': i + 1})
    
    return functions`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n)");
      });

      test("should identify cyclomatic complexity calculation as O(n)", () => {
        const pythonCode = `def calculate_cyclomatic_complexity(code):
    """Calculate cyclomatic complexity - O(n)"""
    complexity = 1
    keywords = ['if', 'elif', 'while', 'for', 'try', 'except']
    
    for line in code.split('\\n'):
        stripped = line.strip()
        for keyword in keywords:
            if keyword in stripped:
                complexity += stripped.count(keyword)
    
    return complexity`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n)");
      });

      test("should identify syntax error highlighting as O(n)", () => {
        const pythonCode = `def highlight_syntax_errors(code, language="python"):
    """Find basic syntax errors - O(n)"""
    errors = []
    lines = code.split('\\n')
    
    for i, line in enumerate(lines):
        if language == "python":
            if line.strip().endswith(':'):
                if 'import' not in line:
                    errors.append({'line': i + 1, 'message': 'Unexpected colon'})
    
    return errors`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n)");
      });
    });

    describe("O(n log n) Linearithmic Time Operations", () => {
      test("should identify import sorting as O(n log n)", () => {
        const pythonCode = `def sort_imports_by_length(imports):
    """Sort import statements by length - O(n log n)"""
    return sorted(imports, key=len)`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n log n)");
      });

      test("should identify merge sort as O(n log n)", () => {
        const pythonCode = `def merge_sort_completions(completions, key_func=None):
    """Merge sort completions - O(n log n)"""
    if len(completions) <= 1:
        return completions
    
    mid = len(completions) // 2
    left = merge_sort_completions(completions[:mid], key_func)
    right = merge_sort_completions(completions[mid:], key_func)
    
    return merge_sorted_lists(left, right, key_func)`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n log n)");
      });

      test("should identify suggestion ranking as O(n log n)", () => {
        const pythonCode = `def rank_code_suggestions(suggestions, context):
    """Rank code suggestions by relevance - O(n log n)"""
    def relevance_score(suggestion):
        score = 0
        for word in context.split():
            if word.lower() in suggestion.lower():
                score += 10
        score += max(0, 50 - len(suggestion))
        return score
    
    return sorted(suggestions, key=relevance_score, reverse=True)`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n log n)");
      });
    });

    describe("O(n²) Quadratic Time Operations", () => {
      test("should identify duplicate function finding as O(n²)", () => {
        const pythonCode = `def find_duplicate_functions(functions):
    """Find duplicate function names - O(n²)"""
    duplicates = []
    for i in range(len(functions)):
        for j in range(i + 1, len(functions)):
            if functions[i]['name'] == functions[j]['name']:
                duplicates.append({
                    'name': functions[i]['name'],
                    'lines': [functions[i]['line'], functions[j]['line']]
                })
    return duplicates`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n²)");
      });

      test("should identify code similarity calculation as O(n²)", () => {
        const pythonCode = `def calculate_code_similarity(code1, code2):
    """Calculate similarity between code blocks - O(n²)"""
    lines1 = [line.strip() for line in code1.split('\\n') if line.strip()]
    lines2 = [line.strip() for line in code2.split('\\n') if line.strip()]
    
    matches = 0
    for line1 in lines1:
        for line2 in lines2:
            if line1 == line2:
                matches += 1
                break
    
    total_lines = len(lines1) + len(lines2)
    return (2 * matches) / total_lines if total_lines > 0 else 0`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n²)");
      });

      test("should identify longest common subsequence as O(n²)", () => {
        const pythonCode = `def find_longest_common_subsequence(text1, text2):
    """Find LCS for diff visualization - O(n²)"""
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    return dp[m][n]`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n²)");
      });
    });

    describe("O(2^n) Exponential Time Operations", () => {
      test("should identify test combination generation as O(2^n)", () => {
        const pythonCode = `def generate_test_combinations(test_params):
    """Generate all possible test combinations - O(2^n)"""
    if not test_params:
        return [{}]
    
    first_param = test_params[0]
    rest_combinations = generate_test_combinations(test_params[1:])
    
    result = []
    for combination in rest_combinations:
        new_combo = combination.copy()
        new_combo[first_param['name']] = first_param['value']
        result.append(new_combo)
        result.append(combination.copy())
    
    return result`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(2^n)");
      });

      test("should identify code path analysis as O(2^n)", () => {
        const pythonCode = `def find_all_code_paths(ast_nodes, current_path=None):
    """Find all possible execution paths - O(2^n)"""
    if current_path is None:
        current_path = []
    
    if not ast_nodes:
        return [current_path]
    
    paths = []
    current_node = ast_nodes[0]
    remaining_nodes = ast_nodes[1:]
    
    if current_node['type'] == 'condition':
        true_path = current_path + [current_node['id'] + '_true']
        paths.extend(find_all_code_paths(remaining_nodes, true_path))
        
        false_path = current_path + [current_node['id'] + '_false']
        paths.extend(find_all_code_paths(remaining_nodes, false_path))
    else:
        new_path = current_path + [current_node['id']]
        paths.extend(find_all_code_paths(remaining_nodes, new_path))
    
    return paths`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(2^n)");
      });
    });

    describe("Performance Optimization Examples", () => {
      test("should analyze extension performance example with multiple complexities", () => {
        const pythonCode = `def extension_performance_example():
    """Example mixing different complexity patterns"""
    cache = {}
    result = cache.get("user_preferences", None)  # O(1)
    
    code = "def hello(): pass"
    lines = code.split('\\n')  # O(n)
    
    functions = []
    for line in lines:  # O(n)
        if line.startswith('def '):
            functions.append(line)
    
    return {'functions': functions, 'result': result}`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n)");
      });

      test("should handle conditional complexity patterns", () => {
        const pythonCode = `def conditional_complexity(test_params):
    """Different complexity based on conditions"""
    if len(test_params) <= 10:
        # Exponential operation for small inputs
        return generate_combinations(test_params)  # O(2^n)
    else:
        # Linear operation for large inputs
        return [param['name'] for param in test_params]  # O(n)`;

        const result = analyzeCodeComplexity(pythonCode);
        expect(result.methods[0].complexity.notation).toBe("O(n)");
      });
    });
  });

  describe("Complexity Indicator Ratings", () => {
    test("should return correct ratings for all complexity types", () => {
      expect(getComplexityIndicator("O(1)")).toBe("EXCELLENT");
      expect(getComplexityIndicator("O(log n)")).toBe("GOOD");
      expect(getComplexityIndicator("O(n)")).toBe("GOOD");
      expect(getComplexityIndicator("O(n log n)")).toBe("FAIR");
      expect(getComplexityIndicator("O(n²)")).toBe("POOR");
      expect(getComplexityIndicator("O(2^n)")).toBe("BAD");
      expect(getComplexityIndicator("O(n!)")).toBe("TERRIBLE");
    });

    test("should provide consistent ratings", () => {
      // Test multiple calls return same result
      expect(getComplexityIndicator("O(1)")).toBe("EXCELLENT");
      expect(getComplexityIndicator("O(1)")).toBe("EXCELLENT");
      expect(getComplexityIndicator("O(n²)")).toBe("POOR");
      expect(getComplexityIndicator("O(n²)")).toBe("POOR");
    });
  });
});
