import * as vscode from "vscode";

/**
 * Shared utilities for webview providers
 */

/**
 * Navigate to a specific function in a file
 */
export async function navigateToFunction(
  fileUri: string,
  functionName: string
): Promise<void> {
  try {
    console.log(
      "Navigating to function:",
      functionName,
      "in file URI:",
      fileUri
    );

    const uri = vscode.Uri.parse(fileUri);
    const document = await vscode.workspace.openTextDocument(uri);

    // Search for the function definition in the document
    const text = document.getText();
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for function definition patterns
      if (
        line.includes(`def ${functionName}(`) ||
        line.includes(`def ${functionName} (`)
      ) {
        // Open and jump to specific line (using 0-based line number for Range)
        const range = new vscode.Range(i, 0, i, 0);
        await vscode.window.showTextDocument(document, {
          selection: range,
        });
        return;
      }
    }

    // If function not found, just open the file
    await vscode.window.showTextDocument(document);
  } catch (error) {
    console.error(
      `Error navigating to function ${functionName} in ${fileUri}:`,
      error
    );
    vscode.window.showErrorMessage(`Failed to open file: ${error}`);
  }
}

/**
 * Navigate to a file (open it in the editor)
 */
export async function navigateToFile(fileUri: string): Promise<void> {
  try {
    console.log("Navigating to file URI:", fileUri);

    // Parse the URI and open the file
    const uri = vscode.Uri.parse(fileUri);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  } catch (error) {
    console.error(`Error opening file ${fileUri}:`, error);
    vscode.window.showErrorMessage(`Failed to open file: ${error}`);
  }
}

/**
 * Get complexity indicator text (EXCELLENT, GOOD, etc.)
 */
export function getComplexityIndicator(complexity: string): string {
  const indicatorMap: { [key: string]: string } = {
    "O(1)": "EXCELLENT",
    "O(log n)": "GOOD",
    "O(n)": "GOOD",
    "O(n log n)": "FAIR",
    "O(n²)": "POOR",
    "O(n³)": "POOR",
    "O(2^n)": "BAD",
    "O(k^n)": "TERRIBLE",
    "O(n!)": "TERRIBLE",
  };
  return indicatorMap[complexity] || "UNKNOWN";
}

/**
 * Get complexity CSS class for styling
 */
export function getComplexityClass(complexity: string): string {
  const classMap: { [key: string]: string } = {
    "O(1)": "excellent",
    "O(log n)": "good",
    "O(n)": "good",
    "O(n log n)": "fair",
    "O(n²)": "poor",
    "O(n³)": "poor",
    "O(2^n)": "bad",
    "O(k^n)": "terrible",
    "O(n!)": "terrible",
  };
  return classMap[complexity] || "unknown";
}

/**
 * Common CSS styles for complexity badges
 */
export const COMPLEXITY_BADGE_STYLES = `
.complexity-badge {
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.8em;
}

.complexity-badge.excellent { background-color: #22C55E; color: white; }
.complexity-badge.good { background-color: #EAB308; color: white; }
.complexity-badge.fair { background-color: #F97316; color: white; }
.complexity-badge.poor { background-color: #EF4444; color: white; }
.complexity-badge.bad { background-color: #DC2626; color: white; }
.complexity-badge.terrible { background-color: #7F1D1D; color: white; }
.complexity-badge.unknown { background-color: #6B7280; color: white; }
`;

/**
 * Common CSS styles for tree nodes
 */
export const TREE_NODE_STYLES = `
.hierarchy-tree {
    font-family: 'Courier New', monospace;
    line-height: 1.5;
}

.tree-node {
    margin: 3px 0;
    padding: 6px 8px;
    border-radius: 4px;
    background-color: var(--vscode-list-inactiveSelectionBackground);
    border-left: 3px solid var(--vscode-panel-border);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.tree-node.level-0 { 
    border-left-color: var(--vscode-textLink-foreground);
    background-color: var(--vscode-list-activeSelectionBackground);
}
.tree-node.level-1 { border-left-color: #22C55E; }
.tree-node.level-2 { border-left-color: #EAB308; }
.tree-node.level-3 { border-left-color: #F97316; }
.tree-node.level-4 { border-left-color: #EF4444; }

.node-connector {
    color: var(--vscode-descriptionForeground);
    margin-right: 8px;
    white-space: pre;
}

.method-header {
    display: flex;
    align-items: center;
    width: 100%;
}

.method-name {
    font-weight: bold;
    color: var(--vscode-symbolIcon-functionForeground);
    flex: 1;
    cursor: pointer;
    transition: color 0.2s;
}

.method-name:hover {
    color: var(--vscode-textLink-activeForeground);
    text-decoration: underline;
}

.method-complexity {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 0.85em;
    flex-shrink: 0;
    margin-left: 16px;
    margin-top: 4px;
}
`;

/**
 * Common JavaScript functions for webviews
 */
export const COMMON_WEBVIEW_SCRIPTS = `
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getComplexityIndicator(complexity) {
    const indicatorMap = {
        "O(1)": "EXCELLENT",
        "O(log n)": "GOOD", 
        "O(n)": "GOOD",
        "O(n log n)": "FAIR",
        "O(n²)": "POOR",
        "O(n³)": "POOR",
        "O(2^n)": "BAD",
        "O(k^n)": "TERRIBLE",
        "O(n!)": "TERRIBLE"
    };
    return indicatorMap[complexity] || "UNKNOWN";
}

function getComplexityClass(complexity) {
    const classMap = {
        "O(1)": "excellent",
        "O(log n)": "good",
        "O(n)": "good",
        "O(n log n)": "fair",
        "O(n²)": "poor",
        "O(n³)": "poor",
        "O(2^n)": "bad",
        "O(k^n)": "terrible",
        "O(n!)": "terrible"
    };
    return classMap[complexity] || "unknown";
}

function navigateToFunction(fileUri, functionName) {
    vscode.postMessage({ type: 'navigateToFunction', fileUri: fileUri, functionName: functionName });
}

function navigateToFile(fileUri) {
    vscode.postMessage({ type: 'navigateToFile', fileUri: fileUri });
}
`;

/**
 * Find worst complexity from a list of methods
 */
export function findWorstComplexity(
  methods: Array<{
    complexity: { notation: string };
    spaceComplexity: { notation: string };
  }>,
  type: "time" | "space"
): string {
  const complexityPriority: { [key: string]: number } = {
    "O(1)": 1,
    "O(log n)": 2,
    "O(n)": 3,
    "O(n log n)": 4,
    "O(n²)": 5,
    "O(n³)": 6,
    "O(2^n)": 7,
    "O(k^n)": 8,
    "O(n!)": 9,
  };

  let worstComplexity = "O(1)";
  let worstPriority = 0;

  for (const method of methods) {
    const complexity =
      type === "time"
        ? method.complexity.notation
        : method.spaceComplexity.notation;

    const priority = complexityPriority[complexity] || 0;
    if (priority > worstPriority) {
      worstPriority = priority;
      worstComplexity = complexity;
    }
  }

  return worstComplexity;
}

/**
 * Sort files by different criteria
 */
export function sortFilesByComplexity<
  T extends {
    worstTimeComplexity: string;
    worstSpaceComplexity: string;
    fileName: string;
  }
>(files: T[], sortBy: string): T[] {
  const complexityPriority: { [key: string]: number } = {
    "O(1)": 1,
    "O(log n)": 2,
    "O(n)": 3,
    "O(n log n)": 4,
    "O(n²)": 5,
    "O(n³)": 6,
    "O(2^n)": 7,
    "O(k^n)": 8,
    "O(n!)": 9,
  };

  switch (sortBy) {
    case "alphabetic":
      return [...files].sort((a, b) => a.fileName.localeCompare(b.fileName));

    case "timeComplexity":
    case "worstToBest":
      return [...files].sort((a, b) => {
        const priorityA = complexityPriority[a.worstTimeComplexity] || 0;
        const priorityB = complexityPriority[b.worstTimeComplexity] || 0;
        return priorityB - priorityA; // Higher complexity first
      });

    case "bestToWorst":
      return [...files].sort((a, b) => {
        const priorityA = complexityPriority[a.worstTimeComplexity] || 0;
        const priorityB = complexityPriority[b.worstTimeComplexity] || 0;
        return priorityA - priorityB; // Lower complexity first
      });

    case "spaceComplexity":
      return [...files].sort((a, b) => {
        const priorityA = complexityPriority[a.worstSpaceComplexity] || 0;
        const priorityB = complexityPriority[b.worstSpaceComplexity] || 0;
        return priorityB - priorityA; // Higher complexity first
      });

    default:
      return files;
  }
}

/**
 * Common CSS styles for all webviews
 */
export const WEBVIEW_STYLES = `
body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    padding: 20px;
    margin: 0;
    line-height: 1.6;
}

.header {
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-bottom: 15px;
    margin-bottom: 20px;
}

.header h2 {
    margin: 0;
    color: var(--vscode-textLink-foreground);
    font-weight: 600;
}

.file-item {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background-color: var(--vscode-list-inactiveSelectionBackground);
}

.file-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-bottom: 8px;
}

.file-name {
    font-weight: bold;
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    flex: 1;
    margin-right: 16px;
    font-family: 'Courier New', monospace;
    font-size: 1.05em;
    transition: color 0.2s;
}

.file-name:hover {
    color: var(--vscode-textLink-activeForeground);
    text-decoration: underline;
}

.file-stats {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-shrink: 0;
    color: var(--vscode-descriptionForeground);
    font-size: 0.9em;
}

.file-stat {
    display: flex;
    align-items: center;
    gap: 5px;
}

${COMPLEXITY_BADGE_STYLES}

${TREE_NODE_STYLES}

.no-files {
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    margin-top: 40px;
}
`;
