import * as vscode from "vscode";
import { addBigOComments, getIndentFromLine } from "../comments/commentManager";
import { MethodAnalysis } from "../models/MethodAnalysis.model";
import { SpaceComplexityResult } from "../models/SpaceComplexityResult.model";

// Mock VSCode API
jest.mock("vscode", () => ({
  TextEdit: {
    replace: jest.fn((range, text) => ({ type: "replace", range, text })),
    insert: jest.fn((position, text) => ({ type: "insert", position, text })),
  },
  Range: jest.fn((start, end) => ({ start, end })),
  Position: jest.fn((line, character) => ({ line, character })),
  WorkspaceEdit: jest.fn(() => ({
    set: jest.fn(),
  })),
  workspace: {
    applyEdit: jest.fn().mockResolvedValue(true),
  },
  window: {
    showErrorMessage: jest.fn(),
  },
}));

describe("Comment Manager with Function Hierarchy", () => {
  let mockEditor: any;
  let mockDocument: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock document
    mockDocument = {
      lineAt: jest.fn(),
      uri: "file:///test.py",
    };

    // Create mock editor
    mockEditor = {
      document: mockDocument,
    };
  });

  describe("getIndentFromLine", () => {
    test("should extract correct indentation", () => {
      expect(getIndentFromLine("def function():")).toBe("");
      expect(getIndentFromLine("    def function():")).toBe("    ");
      expect(getIndentFromLine("        def function():")).toBe("        ");
      expect(getIndentFromLine("\t\tdef function():")).toBe("\t\t");
      expect(getIndentFromLine("")).toBe("");
    });
  });

  describe("addBigOComments for Hierarchy Functions", () => {
    test("should add comments for merge sort hierarchy", async () => {
      // Mock document lines
      mockDocument.lineAt.mockImplementation((lineIndex: number) => {
        const lines = [
          "def merge_sort(arr):", // line 0
          "    if len(arr) <= 1:", // line 1
          "        return arr", // line 2
          "    mid = len(arr) // 2", // line 3
          "    left = merge_sort(arr[:mid])", // line 4
          "    right = merge_sort(arr[mid:])", // line 5
          "    return merge(left, right)", // line 6
          "", // line 7
          "def merge(left, right):", // line 8
          "    result = []", // line 9
          "    i = j = 0", // line 10
        ];

        return {
          text: lines[lineIndex] || "",
        };
      });

      const defaultSpaceComplexity: SpaceComplexityResult = {
        notation: "O(1)",
        description: "Constant space",
        confidence: 85,
        dataStructures: [],
      };

      const methods: MethodAnalysis[] = [
        {
          name: "merge_sort",
          lineStart: 1,
          lineEnd: 7,
          complexity: {
            notation: "O(n log n)",
            description:
              "Classic merge sort with divide-and-conquer and merge; Calls functions with complexities: merge(O(n))",
            confidence: 95,
          },
          spaceComplexity: defaultSpaceComplexity,
          explanation: "Divide and conquer algorithm",
        },
        {
          name: "merge",
          lineStart: 9,
          lineEnd: 11,
          complexity: {
            notation: "O(n)",
            description: "Single loop through input data",
            confidence: 75,
          },
          spaceComplexity: defaultSpaceComplexity,
          explanation: "Linear merge operation",
        },
      ];

      await addBigOComments(mockEditor, methods);

      // Verify WorkspaceEdit was created and applied
      expect(vscode.WorkspaceEdit).toHaveBeenCalled();
      expect(vscode.workspace.applyEdit).toHaveBeenCalled();

      // Verify TextEdit calls for both functions
      expect(vscode.TextEdit.insert).toHaveBeenCalledTimes(2);

      // Check merge_sort comment
      expect(vscode.TextEdit.insert).toHaveBeenCalledWith(
        expect.objectContaining({ line: 0, character: 0 }),
        "# FAIR Time: O(n log n) | EXCELLENT Space: O(1)\n"
      );

      // Check merge comment
      expect(vscode.TextEdit.insert).toHaveBeenCalledWith(
        expect.objectContaining({ line: 8, character: 0 }),
        "# GOOD Time: O(n) | EXCELLENT Space: O(1)\n"
      );
    });

    test("should handle existing comments with hierarchy information", async () => {
      // Mock document with existing comment
      mockDocument.lineAt.mockImplementation((lineIndex: number) => {
        const lines = [
          "# POOR Time: O(n²) | GOOD Space: O(n)", // line 0 - existing comment
          "def bubble_sort(arr):", // line 1
          "    for i in range(len(arr)):", // line 2
          "        for j in range(len(arr)-1):", // line 3
          "            helper_function(arr[j])", // line 4
        ];

        return {
          text: lines[lineIndex] || "",
          length: lines[lineIndex]?.length || 0,
        };
      });

      const defaultSpaceComplexity: SpaceComplexityResult = {
        notation: "O(1)",
        description: "Constant space",
        confidence: 85,
        dataStructures: [],
      };

      const methods: MethodAnalysis[] = [
        {
          name: "bubble_sort",
          lineStart: 2, // 1-indexed line number
          lineEnd: 5,
          complexity: {
            notation: "O(n²)",
            description:
              "Nested loops over input; Calls functions with complexities: helper_function(O(1))",
            confidence: 90,
          },
          spaceComplexity: defaultSpaceComplexity,
          explanation: "Quadratic sorting algorithm",
        },
      ];

      await addBigOComments(mockEditor, methods);

      // Should replace existing comment
      expect(vscode.TextEdit.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          start: { line: 0, character: 0 },
          end: {
            line: 0,
            character: "# POOR Time: O(n²) | GOOD Space: O(n)".length,
          },
        }),
        "# POOR Time: O(n²) | EXCELLENT Space: O(1)"
      );
    });

    test("should preserve indentation for nested functions", async () => {
      // Mock document with indented function
      mockDocument.lineAt.mockImplementation((lineIndex: number) => {
        const lines = [
          "class SortingAlgorithms:", // line 0
          "    def merge_sort(self, arr):", // line 1 - indented
          "        if len(arr) <= 1:", // line 2
          "            return arr", // line 3
          "        return self.merge(left, right)", // line 4
        ];

        return {
          text: lines[lineIndex] || "",
        };
      });

      const defaultSpaceComplexity: SpaceComplexityResult = {
        notation: "O(1)",
        description: "Constant space",
        confidence: 85,
        dataStructures: [],
      };

      const methods: MethodAnalysis[] = [
        {
          name: "merge_sort",
          lineStart: 2, // 1-indexed
          lineEnd: 5,
          complexity: {
            notation: "O(n log n)",
            description: "Divide and conquer with merge operation",
            confidence: 95,
          },
          spaceComplexity: defaultSpaceComplexity,
          explanation: "Class method implementation",
        },
      ];

      await addBigOComments(mockEditor, methods);

      // Should preserve class-level indentation
      expect(vscode.TextEdit.insert).toHaveBeenCalledWith(
        expect.objectContaining({ line: 1, character: 0 }),
        "    # FAIR Time: O(n log n) | EXCELLENT Space: O(1)\n"
      );
    });

    test("should handle functions with propagated complexity descriptions", async () => {
      mockDocument.lineAt.mockImplementation((lineIndex: number) => {
        const lines = [
          "def main_algorithm(data):", // line 0
          "    preprocessed = preprocess(data)", // line 1
          "    return sort_data(preprocessed)", // line 2
        ];

        return {
          text: lines[lineIndex] || "",
        };
      });

      const defaultSpaceComplexity: SpaceComplexityResult = {
        notation: "O(1)",
        description: "Constant space",
        confidence: 85,
        dataStructures: [],
      };

      const methods: MethodAnalysis[] = [
        {
          name: "main_algorithm",
          lineStart: 1, // 1-indexed
          lineEnd: 3,
          complexity: {
            notation: "O(n log n)",
            description:
              "Linear preprocessing; Calls functions with complexities: preprocess(O(n)), sort_data(O(n log n))",
            confidence: 85,
          },
          spaceComplexity: defaultSpaceComplexity,
          explanation: "Main algorithm with function calls",
        },
      ];

      await addBigOComments(mockEditor, methods);

      // Should successfully add comment with complex description
      expect(vscode.TextEdit.insert).toHaveBeenCalledWith(
        expect.objectContaining({ line: 0, character: 0 }),
        "# FAIR Time: O(n log n) | EXCELLENT Space: O(1)\n"
      );
    });

    test("should handle errors gracefully", async () => {
      // Mock workspace.applyEdit to fail
      (vscode.workspace.applyEdit as jest.Mock).mockResolvedValueOnce(false);

      mockDocument.lineAt.mockReturnValue({ text: "def test():" });

      const defaultSpaceComplexity: SpaceComplexityResult = {
        notation: "O(1)",
        description: "Constant space",
        confidence: 85,
        dataStructures: [],
      };

      const methods: MethodAnalysis[] = [
        {
          name: "test",
          lineStart: 1,
          lineEnd: 1,
          complexity: {
            notation: "O(1)",
            description: "Constant time",
            confidence: 95,
          },
          spaceComplexity: defaultSpaceComplexity,
          explanation: "Simple function",
        },
      ];

      await addBigOComments(mockEditor, methods);

      // Should show error message
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Failed to update Big-O comments"
      );
    });
  });
});
