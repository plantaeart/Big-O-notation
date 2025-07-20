import * as vscode from "vscode";
import { PythonKeywords } from "../constants/pythonKeyWordsConst";

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
      // Look for function definition patterns (including async functions)
      if (
        line.includes(`${PythonKeywords.DEF} ${functionName}(`) ||
        line.includes(`${PythonKeywords.DEF} ${functionName} (`) ||
        line.includes(
          `${PythonKeywords.ASYNC} ${PythonKeywords.DEF} ${functionName}(`
        ) ||
        line.includes(
          `${PythonKeywords.ASYNC} ${PythonKeywords.DEF} ${functionName} (`
        )
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
 * Improve function rating using GitHub Copilot Chat
 */
export async function improveFunctionRating(
  fileUri: string,
  functionName: string,
  functionCode: string,
  currentComplexity: {
    notation: string;
    description: string;
    confidence: number;
  },
  childDependencies: string[]
): Promise<void> {
  try {
    // Ask user if they want to use current chat or create a new one
    const chatOption = await vscode.window.showQuickPick(
      [
        {
          label: "New Window Chat",
          description: "Create a new Copilot Chat panel in the sidebar",
          id: "newWindow",
        },
        {
          label: "New Inline Chat",
          description: "Create a new inline chat window",
          id: "newInline",
        },
        {
          label: "Current Chat",
          description: "Use the current chat session (copy to clipboard)",
          id: "current",
        },
      ],
      {
        placeHolder: "How would you like to open Copilot Chat?",
        ignoreFocusOut: true,
      }
    );

    if (!chatOption) {
      return; // User cancelled
    }

    // Build the improvement prompt
    let prompt = await buildImprovementPrompt(
      functionName,
      functionCode,
      currentComplexity,
      childDependencies
    );

    switch (chatOption.id) {
      case "newWindow":
        // Open Copilot Chat in sidebar and auto-paste prompt
        try {
          // Show loading message
          const loadingMessage = vscode.window.setStatusBarMessage(
            "💬 Opening window chat..."
          );

          // Try multiple possible commands for opening chat panel
          const chatCommands = [
            "workbench.panel.chat.view.copilot.focus",
            "workbench.view.chat",
            "github.copilot.openChat",
            "workbench.action.openChat",
            "workbench.panel.chatSidebar.focus",
          ];

          let commandWorked = false;
          for (const command of chatCommands) {
            try {
              await vscode.commands.executeCommand(command);
              commandWorked = true;
              break;
            } catch (error) {
              // Try next command
              continue;
            }
          }

          if (!commandWorked) {
            loadingMessage.dispose();
            throw new Error("No chat command worked");
          }

          // Update loading message
          loadingMessage.dispose();
          const insertingMessage = vscode.window.setStatusBarMessage(
            "💬 Inserting prompt..."
          );

          // Wait for chat panel to open and focus, then auto-paste
          await autoInsertPromptIntoChat(
            prompt,
            "Window Chat opened!",
            insertingMessage,
            false // Clear input for new window
          );
        } catch (error) {
          // Fallback: just copy to clipboard and show message
          await vscode.env.clipboard.writeText(prompt);
          vscode.window
            .showInformationMessage(
              "💬 Prompt copied to clipboard! Please open Copilot Chat manually and paste with Ctrl+V.",
              "Open Chat Panel"
            )
            .then((selection) => {
              if (selection === "Open Chat Panel") {
                vscode.commands
                  .executeCommand("workbench.view.extensions")
                  .then(() => {
                    vscode.window.showInformationMessage(
                      "Search for 'GitHub Copilot Chat' extension and open it."
                    );
                  });
              }
            });
        }
        break;

      case "newInline":
        // Open inline chat and auto-paste prompt
        try {
          // Show loading message
          const loadingMessage = vscode.window.setStatusBarMessage(
            "💬 Opening inline chat..."
          );

          await vscode.commands.executeCommand("vscode.editorChat.start");

          // Update loading message
          loadingMessage.dispose();
          const insertingMessage = vscode.window.setStatusBarMessage(
            "💬 Inserting prompt..."
          );

          // Auto-paste the prompt into the inline chat
          await autoInsertPromptIntoChat(
            prompt,
            "Inline chat opened!",
            insertingMessage,
            false // Clear input for new inline chat
          );
        } catch (error) {
          // Fallback: copy to clipboard
          await vscode.env.clipboard.writeText(prompt);
          vscode.window.showInformationMessage(
            "💬 Prompt copied to clipboard! Please open inline chat manually (Ctrl+I) and paste with Ctrl+V.",
            "OK"
          );
        }
        break;

      case "current":
        // Auto-paste into current chat (try to find active chat first)
        try {
          // Show loading message
          const loadingMessage = vscode.window.setStatusBarMessage(
            "💬 Inserting prompt into current chat..."
          );

          // Try to focus on chat first before pasting
          const chatFocusCommands = [
            "workbench.panel.chat.view.copilot.focus",
            "workbench.view.chat",
            "github.copilot.chat.focus",
            "workbench.action.chat.focus",
          ];

          let chatFocused = false;
          for (const command of chatFocusCommands) {
            try {
              await vscode.commands.executeCommand(command);
              chatFocused = true;
              break;
            } catch (error) {
              // Try next command
              continue;
            }
          }

          // Clear loading message
          loadingMessage.dispose();

          if (chatFocused) {
            // Update loading message
            const insertingMessage = vscode.window.setStatusBarMessage(
              "💬 Inserting prompt..."
            );

            await autoInsertPromptIntoChat(
              prompt,
              "Prompt inserted into current chat!",
              insertingMessage,
              true // Skip clearing for existing chat to avoid freezing
            );
          } else {
            // If we can't focus chat, fallback to clipboard
            await vscode.env.clipboard.writeText(prompt);
            vscode.window.showWarningMessage(
              "💬 Could not find active chat. Prompt copied to clipboard - please paste manually in your chat.",
              "OK"
            );
          }
        } catch (error) {
          // Fallback for current chat
          await vscode.env.clipboard.writeText(prompt);
          vscode.window.showWarningMessage(
            "💬 Could not access current chat. Prompt copied to clipboard - please paste manually.",
            "OK"
          );
        }
        break;
    }
  } catch (error) {
    console.error(
      `Error improving function rating for ${functionName}:`,
      error
    );
    vscode.window.showErrorMessage(`Failed to open Copilot Chat: ${error}`);
  }
}

/**
 * Auto-insert prompt into chat with multiple fallback methods
 */
async function autoInsertPromptIntoChat(
  prompt: string,
  successMessage: string,
  loadingMessage?: vscode.Disposable,
  skipClearing: boolean = false
): Promise<void> {
  try {
    // Copy to clipboard first as a fallback
    await vscode.env.clipboard.writeText(prompt);

    // Show visible progress message
    const progressMessage = vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "💬 Inserting prompt into chat...",
        cancellable: false,
      },
      async (progress, token) => {
        // Wait a moment for chat UI to load
        progress.report({
          increment: 20,
          message: "Waiting for chat to load...",
        });
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Clear existing chat input first (but be gentle about it)
        if (!skipClearing) {
          progress.report({ increment: 40, message: "Clearing chat input..." });
          await clearChatInput();

          // Add a small pause to let the chat stabilize
          await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          progress.report({ increment: 40, message: "Preparing to insert..." });
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Method 1: Try to use VS Code's type command to insert text
        progress.report({ increment: 60, message: "Inserting prompt..." });
        try {
          await vscode.commands.executeCommand("type", { text: prompt });
          progress.report({
            increment: 100,
            message: "Prompt inserted successfully!",
          });
          if (loadingMessage) {
            loadingMessage.dispose();
          }
          vscode.window.showInformationMessage(
            `💬 ${successMessage} Prompt auto-inserted!`,
            "OK"
          );
          return;
        } catch (error) {
          // Type command failed, try next method
        }

        // Method 2: Try to paste from clipboard
        try {
          await vscode.commands.executeCommand(
            "editor.action.clipboardPasteAction"
          );
          progress.report({
            increment: 100,
            message: "Prompt pasted successfully!",
          });
          if (loadingMessage) {
            loadingMessage.dispose();
          }
          vscode.window.showInformationMessage(
            `💬 ${successMessage} Prompt auto-pasted!`,
            "OK"
          );
          return;
        } catch (error) {
          // Paste command failed, try next method
        }

        // Method 3: Try alternative paste commands
        const pasteCommands = [
          "workbench.action.terminal.paste",
          "editor.action.paste",
          "paste",
        ];

        for (const command of pasteCommands) {
          try {
            await vscode.commands.executeCommand(command);
            progress.report({
              increment: 100,
              message: "Prompt pasted successfully!",
            });
            if (loadingMessage) {
              loadingMessage.dispose();
            }
            vscode.window.showInformationMessage(
              `💬 ${successMessage} Prompt auto-pasted!`,
              "OK"
            );
            return;
          } catch (error) {
            // Try next command
            continue;
          }
        }

        // Method 4: Try to insert via active text editor (for inline chat)
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          try {
            const success = await editor.edit((editBuilder) => {
              editBuilder.insert(editor.selection.active, prompt);
            });
            if (success) {
              progress.report({
                increment: 100,
                message: "Prompt inserted successfully!",
              });
              if (loadingMessage) {
                loadingMessage.dispose();
              }
              vscode.window.showInformationMessage(
                `💬 ${successMessage} Prompt auto-inserted!`,
                "OK"
              );
              return;
            }
          } catch (error) {
            // Editor insertion failed
          }
        }

        // Method 5: Simulate keyboard shortcuts
        try {
          // Focus the chat input and simulate Ctrl+V
          await vscode.commands.executeCommand(
            "workbench.action.focusActiveEditorGroup"
          );
          await new Promise((resolve) => setTimeout(resolve, 200));
          await vscode.commands.executeCommand(
            "editor.action.clipboardPasteAction"
          );
          progress.report({
            increment: 100,
            message: "Prompt pasted successfully!",
          });
          if (loadingMessage) {
            loadingMessage.dispose();
          }
          vscode.window.showInformationMessage(
            `💬 ${successMessage} Prompt auto-pasted!`,
            "OK"
          );
          return;
        } catch (error) {
          // Focus and paste failed
        }

        // Final fallback: notify user to paste manually
        progress.report({
          increment: 100,
          message: "Please paste manually...",
        });
        if (loadingMessage) {
          loadingMessage.dispose();
        }
        vscode.window.showInformationMessage(
          `💬 ${successMessage} Prompt copied to clipboard - paste with Ctrl+V in the chat.`,
          "OK"
        );
      }
    );

    await progressMessage;
  } catch (error) {
    // Ultimate fallback
    if (loadingMessage) {
      loadingMessage.dispose();
    }
    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage(
      "💬 Prompt copied to clipboard! Please paste it manually with Ctrl+V.",
      "OK"
    );
  }
}

/**
 * Clear the chat input before pasting new content
 */
async function clearChatInput(): Promise<void> {
  try {
    // Method 1: Try gentle clearing - select all and replace with empty
    try {
      await vscode.commands.executeCommand("editor.action.selectAll");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await vscode.commands.executeCommand("type", { text: "" });
      return; // If this works, we're done
    } catch (error) {
      // Continue to next method
    }

    // Method 2: Try select all and single delete
    try {
      await vscode.commands.executeCommand("editor.action.selectAll");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await vscode.commands.executeCommand("deleteLeft");
      return; // If this works, we're done
    } catch (error) {
      // Continue to next method
    }

    // Method 3: Try Ctrl+A and single backspace (less aggressive)
    try {
      await vscode.commands.executeCommand("editor.action.selectAll");
      await new Promise((resolve) => setTimeout(resolve, 50));
      await vscode.commands.executeCommand("deleteLeft");
      return; // If this works, we're done
    } catch (error) {
      // Continue to next method
    }

    // Method 4: Fallback - just a few gentle backspaces (reduced from 50 to 10)
    try {
      for (let i = 0; i < 10; i++) {
        await vscode.commands.executeCommand("deleteLeft");
        await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay between each
      }
    } catch (error) {
      // If all clearing methods fail, just continue without clearing
      console.log("Could not clear chat input, continuing anyway");
    }
  } catch (error) {
    // If there's any unexpected error, don't let it break the paste operation
    console.log("Chat clearing failed, continuing with paste:", error);
  }
}

/**
 * Build the improvement prompt for GitHub Copilot Chat
 */
async function buildImprovementPrompt(
  functionName: string,
  functionCode: string,
  currentComplexity: {
    notation: string;
    description: string;
    confidence: number;
  },
  childDependencies: string[]
): Promise<string> {
  let prompt = `# Improve Big O Notation Rating for Function: ${functionName}

## Current Analysis
- **Function Name**: \`${functionName}\`
- **Current Time Complexity**: ${currentComplexity.notation}
- **Description**: ${currentComplexity.description}
- **Confidence**: ${currentComplexity.confidence}%

## Function Code
\`\`\`python
${functionCode}
\`\`\`
`;

  // Add child dependencies information if any
  if (childDependencies && childDependencies.length > 0) {
    prompt += `
## Child Function Dependencies
This function's complexity rating is affected by the following child functions:
${childDependencies.map((dep) => `- \`${dep}\``).join("\n")}

**Note**: To improve the parent function's rating, you may need to optimize these child functions first. Please analyze whether the main function logic can be improved directly, or if optimizing the child functions would be more beneficial.
`;
  }

  prompt += `
## Task
Please analyze this function and provide suggestions to improve its Big O notation rating:

1. **Current Assessment**: Is the current ${
    currentComplexity.notation
  } rating accurate? Explain why.

2. **Improvement Opportunities**: 
   - Can the algorithm be optimized to achieve better time complexity?
   - Are there more efficient data structures or algorithms that could be used?
   - Are there any unnecessary operations that could be eliminated?

3. **Implementation Strategy**:
   - Provide specific code improvements if possible
   - Explain the trade-offs (time vs space complexity)
   - Consider readability and maintainability

4. **If No Improvement is Possible**:
   - Explain why the current complexity is optimal for this algorithm
   - Discuss any fundamental limitations
   - Suggest alternative approaches if the requirements could be changed

${
  childDependencies.length > 0
    ? `
5. **Child Function Analysis**:
   - Should we focus on optimizing the child functions instead?
   - How would improving child functions affect the overall complexity?
   - Which child function optimization would provide the most benefit?
`
    : ""
}

Please provide actionable recommendations with clear explanations of the Big O complexity improvements.`;

  return prompt;
}

/**
 * Extract function code from file
 */
export async function extractFunctionCode(
  fileUri: string,
  functionName: string
): Promise<string> {
  try {
    const uri = vscode.Uri.parse(fileUri);
    const document = await vscode.workspace.openTextDocument(uri);
    const text = document.getText();
    const lines = text.split("\n");

    let functionStartLine = -1;
    let functionEndLine = -1;
    let functionIndent = 0;

    // Find function start
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes(`def ${functionName}(`) ||
        line.includes(`def ${functionName} (`) ||
        line.includes(`async def ${functionName}(`) ||
        line.includes(`async def ${functionName} (`)
      ) {
        functionStartLine = i;
        functionIndent = line.length - line.trimStart().length;
        break;
      }
    }

    if (functionStartLine === -1) {
      return `# Function ${functionName} not found`;
    }

    // Find function end by looking for next function or end of indentation
    for (let i = functionStartLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === "") {
        continue; // Skip empty lines
      }

      const lineIndent = line.length - line.trimStart().length;

      // If we hit a line at the same or lower indentation that's not part of the function
      if (lineIndent <= functionIndent && !trimmed.startsWith("#")) {
        functionEndLine = i - 1;
        break;
      }
    }

    // If we didn't find an end, use the end of file
    if (functionEndLine === -1) {
      functionEndLine = lines.length - 1;
    }

    // Extract function code
    const functionLines = lines.slice(functionStartLine, functionEndLine + 1);
    return functionLines.join("\n");
  } catch (error) {
    console.error(`Error extracting function code for ${functionName}:`, error);
    return `# Error extracting function code: ${error}`;
  }
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
    gap: 8px;
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

.improve-button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75em;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
    white-space: nowrap;
}

.improve-button:hover {
    background: var(--vscode-button-hoverBackground);
    transform: scale(1.05);
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

function improveFunctionRating(fileUri, functionName, functionCode, currentComplexity, childDependencies) {
    vscode.postMessage({ 
        type: 'improveFunctionRating', 
        fileUri: fileUri, 
        functionName: functionName,
        functionCode: functionCode,
        currentComplexity: currentComplexity,
        childDependencies: childDependencies
    });
}

function findWorstComplexity(methods, type) {
    const complexityPriority = {
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
        const complexity = type === "time" 
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

function sortFilesByComplexity(files, sortBy) {
    const complexityPriority = {
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

function buildHierarchyTree(methods, hierarchyMap) {
    const methodMap = new Map(methods.map(m => [m.name, m]));
    const childrenMap = new Map();
    const parentCount = new Map(); // Track how many parents each function has

    // Build children map and count parents for each function
    for (const [parent, children] of hierarchyMap) {
        const validChildren = children.filter(child => methodMap.has(child));
        if (validChildren.length > 0) {
            childrenMap.set(parent, validChildren);
            
            // Count parents for each child
            validChildren.forEach(child => {
                parentCount.set(child, (parentCount.get(child) || 0) + 1);
            });
        }
    }

    // For functions with multiple parents, choose the most appropriate parent
    const finalChildrenMap = new Map();
    const assignedChildren = new Set();

    for (const [parent, children] of childrenMap) {
        const uniqueChildren = children.filter(child => {
            if (assignedChildren.has(child)) return false;
            
            // If function has only one parent, assign it
            if (parentCount.get(child) === 1) {
                assignedChildren.add(child);
                return true;
            }
            
            // For multiple parents, assign to the first encountered
            const isFirstEncounter = !assignedChildren.has(child);
            if (isFirstEncounter) {
                assignedChildren.add(child);
                return true;
            }
            
            return false;
        });

        if (uniqueChildren.length > 0) {
            finalChildrenMap.set(parent, uniqueChildren);
        }
    }

    // Find root nodes (functions that are not children of other functions)
    const rootNodes = methods
        .filter(method => !assignedChildren.has(method.name))
        .map(method => createTreeNode(method, finalChildrenMap, methodMap, 0));

    return rootNodes;
}

function createTreeNode(method, childrenMap, methodMap, level) {
    const children = (childrenMap.get(method.name) || [])
        .map(childName => {
            const childMethod = methodMap.get(childName);
            return childMethod ? createTreeNode(childMethod, childrenMap, methodMap, level + 1) : null;
        })
        .filter(node => node !== null);

    return {
        method: method,
        children: children,
        level: level
    };
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
